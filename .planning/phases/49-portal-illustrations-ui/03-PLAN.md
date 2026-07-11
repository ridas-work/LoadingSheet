---
wave: 2
depends_on: ["01"]
gap_closure: false
files_modified:
  - "app/signup/page.tsx"
  - "app/register/page.tsx"
autonomous: true
---

<phase_goal>
Replace the `/signup` redirect with an attractive **Waleed Tech** branded landing page using the fourth illustration, linking users to login.
</phase_goal>

<must_haves>
- [ ] `/signup` renders a split layout (like login): illustration panel + info card.
- [ ] Waleed Tech composite image on the brand panel (`waleed-tech-signup.png`).
- [ ] Clear CTA: "Sign in" → `/login`; copy explains accounts are created by admin (no public self-registration).
- [ ] `/register` redirects to `/signup` (or `/login` — pick one and document in STATE).
</must_haves>

<tasks>
  <task id="T1" title="Signup page UI">
    <step>Convert `app/signup/page.tsx` from redirect to a server or client page mirroring `login-shell` grid.</step>
    <step>Left panel: `next/image` Waleed Tech illustration + headline "Waleed Tech Loading Sheet".</step>
    <step>Right panel: short welcome text + link/button to `/login`.</step>
  </task>

  <task id="T2" title="Register redirect">
    <step>Update `app/register/page.tsx` to `redirect('/signup')` so both entry URLs show branding.</step>
  </task>
</tasks>

<verification>
- Visit `/signup` logged out — illustration visible, login link works.
- Visit `/register` — lands on signup branding page.
</verification>
