// Command server is a small HTTP API that renders the same "Elastic Rise"
// lower-thirds animation as the static site's video-recorded.html, but over
// HTTP instead of a browser click. It drives a headless Chrome instance
// (chromedp) against the public site's URL API and streams back the
// resulting video — see MCP_GUIDE.md / mcp-guide.html for the full contract.
package main

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"os"
	"time"

	"github.com/chromedp/cdproto/runtime"
	"github.com/chromedp/chromedp"
)

type renderRequest struct {
	Icon1 string `json:"icon1"`
	Text1 string `json:"text1"`
	Icon2 string `json:"icon2"`
	Text2 string `json:"text2"`
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	token := os.Getenv("API_TOKEN")
	if token == "" {
		log.Fatal("API_TOKEN env var is required")
	}
	siteBase := os.Getenv("SITE_BASE_URL")
	if siteBase == "" {
		siteBase = "https://rifaterdemsahin.github.io/animation-rising-lower-thirds"
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})
	mux.HandleFunc("/render", renderHandler(token, siteBase))

	log.Printf("listening on :%s (site base %s)", port, siteBase)
	log.Fatal(http.ListenAndServe(":"+port, mux))
}

func renderHandler(token, siteBase string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "POST only", http.StatusMethodNotAllowed)
			return
		}
		if r.Header.Get("Authorization") != "Bearer "+token {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		var req renderRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "invalid JSON body", http.StatusBadRequest)
			return
		}
		if req.Icon1 == "" || req.Text1 == "" || req.Icon2 == "" || req.Text2 == "" {
			http.Error(w, "icon1, text1, icon2, text2 are all required", http.StatusBadRequest)
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), 45*time.Second)
		defer cancel()

		videoBytes, mimeType, err := renderVideo(ctx, siteBase, req)
		if err != nil {
			log.Printf("render error: %v", err)
			http.Error(w, "render failed: "+err.Error(), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", mimeType)
		w.Header().Set("Content-Disposition", `attachment; filename="lower-thirds.webm"`)
		_, _ = w.Write(videoBytes)
	}
}

// renderVideo drives headless Chrome to video-recorded.html?...&autorecord=1,
// waits for the page's own "Recording ready." status, then pulls the
// resulting Blob out of the page as base64 (see MCP_GUIDE.md "Option 1" for
// the browser-automation pattern this mirrors in Go instead of Node/Puppeteer).
func renderVideo(ctx context.Context, siteBase string, req renderRequest) ([]byte, string, error) {
	u, err := url.Parse(siteBase + "/video-recorded.html")
	if err != nil {
		return nil, "", err
	}
	q := u.Query()
	q.Set("icon1", req.Icon1)
	q.Set("text1", req.Text1)
	q.Set("icon2", req.Icon2)
	q.Set("text2", req.Text2)
	q.Set("autorecord", "1")
	u.RawQuery = q.Encode()

	opts := append(chromedp.DefaultExecAllocatorOptions[:],
		chromedp.Flag("headless", true),
		chromedp.Flag("no-sandbox", true),
		chromedp.Flag("disable-gpu", true),
		chromedp.Flag("disable-dev-shm-usage", true),
	)
	if execPath := os.Getenv("CHROMEDP_EXEC_PATH"); execPath != "" {
		opts = append(opts, chromedp.ExecPath(execPath))
	}

	allocCtx, cancelAlloc := chromedp.NewExecAllocator(ctx, opts...)
	defer cancelAlloc()

	taskCtx, cancelTask := chromedp.NewContext(allocCtx)
	defer cancelTask()

	var base64Data string
	err = chromedp.Run(taskCtx,
		chromedp.Navigate(u.String()),
		chromedp.WaitReady("body"),
		chromedp.Poll(
			`document.getElementById("status") && document.getElementById("status").textContent === "Recording ready."`,
			nil,
			chromedp.WithPollingTimeout(30*time.Second),
		),
		chromedp.Evaluate(`(function () {
			var link = document.getElementById("download-link");
			return fetch(link.href)
				.then(function (res) { return res.blob(); })
				.then(function (blob) {
					return new Promise(function (resolve) {
						var reader = new FileReader();
						reader.onloadend = function () { resolve(reader.result.split(",")[1]); };
						reader.readAsDataURL(blob);
					});
				});
		})()`, &base64Data, func(p *runtime.EvaluateParams) *runtime.EvaluateParams {
			return p.WithAwaitPromise(true)
		}),
	)
	if err != nil {
		return nil, "", fmt.Errorf("chromedp run: %w", err)
	}
	if base64Data == "" {
		return nil, "", errors.New("empty video result")
	}

	data, err := base64.StdEncoding.DecodeString(base64Data)
	if err != nil {
		return nil, "", fmt.Errorf("decode base64: %w", err)
	}
	return data, "video/webm", nil
}
