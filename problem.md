# Technical Animation Specification: Elastic Rise Lower Thirds

This document serves as the formal design and motion specification for implementing the twin "Real Jobs / Real People" lower-third elements.

---

## 1. Visual Specification

### Dimensions & Geometry

| Attribute | Specification | Notes |
| --- | --- | --- |
| **Element Type** | Dual Rounded Rectangles | Parallel layout, variable width based on content |
| **Border Radius** | $24\text{px}$ to $30\text{px}$ | Generous rounding |
| **Background Fill** | `#0B1B1E` | $85\%$ Opacity dark teal / charcoal |
| **Border Stroke** | $1\text{px}$ Solid | `#FFFFFF` with $40\%$ opacity |
| **Internal Padding** | Top/Bottom: $14\text{px}$, Left/Right: $28\text{px}$ | Spatial breathing room |
| **Gap (Between Cards)** | $24\text{px}$ | Centered horizontally relative to each other |

### Typography & Iconography

* **Icon (Left):** Custom SVG glyph or emoji (e.g., 💼 / 👤), colored in Vibrant Cyan (`#00D2D2`).
* **Typography (Right):** Serif typeface (e.g., *Georgia* or *Times New Roman*), white (`#FFFFFF`), regular weight.

---

## 2. Motion Choreography & Timing

The entrance must feel physical, organic, and rapid, utilizing a damped spring bounce to settle into position.

```
                  [Settle / Rest]  <-- Subside spring
                      _  _
                     / \/ \
                    /      \
[Rise Upwards]     /
   ^              /
   |             /
[Off-screen] ---/

```

### Motion Phases

1. **Initial State (Frame 0):**
* Position: Offset downwards by $Y = +120\text{px}$ from resting position.
* Opacity: $0\%$.
* Scale (Optional): $95\%$ to give a slight depth change.


2. **Action Phase (Frames 1–15):**
* Rapid vertical ascent.
* Opacity reaches $100\%$ by frame 8.


3. **Settle Phase (Frames 15–30):**
* Deceleration and overshoot. The elements bounce past their target line and settle elastically.


4. **Stagger Interval:**
* Card 2 (Right) is offset in time by exactly **$+150\text{ms}$** (approx. 4–5 frames at 30fps) relative to Card 1 (Left).



---

## 3. Mathematical Motion Profile (The "Spring" Spec)

For programmatic/procedural implementation, the vertical motion $y(t)$ follows a **Damped Harmonic Oscillation** model:

$$y(t) = y_{\text{target}} + A \cdot e^{-\zeta \omega_n t} \cos(\omega_d t)$$

Where:

* $y_{\text{target}}$ is the final resting coordinate.
* $A$ is the initial displacement amplitude ($-120\text{px}$).
* $\zeta$ is the damping ratio (tuned to $0.5$ for a noticeable, yet professional bounce).
* $\omega_n$ is the natural frequency of the spring system.

### Bezier Curve Alternative

If implementing via standard CSS transition or linear keyframes without expressions, use the following cubic-bezier coordinates:

```css
transition-timing-function: cubic-bezier(0.175, 0.885, 0.32, 1.125);

```

> This specific curve pulls the elements up quickly, overshoots the resting boundaries by $12.5\%$, and pulls back smoothly to a standstill.
