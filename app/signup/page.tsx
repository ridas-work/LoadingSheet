import Image from "next/image";
import Link from "next/link";

import { PORTAL_IMAGES } from "@/lib/portalTheme";
import { ui } from "@/lib/ui";

export default function SignupPage() {
  return (
    <div className="login-shell">
      <div className="portal-hero-signup login-brand-panel !flex">
        <div className="relative z-10 max-w-lg">
          <h1 className="text-3xl font-bold tracking-tight text-white">Waleed Tech Loading Sheet</h1>
          <p className="mt-3 text-base leading-relaxed text-brand-100/90">
            One connected workflow for purchase orders, production batches, dispatch loading sheets,
            and packaging inventory.
          </p>
          <Image
            src={PORTAL_IMAGES.signup}
            alt="Waleed Tech logistics and warehouse operations"
            width={480}
            height={360}
            className="signup-brand-image"
            priority
          />
        </div>
      </div>

      <div className="login-form-panel">
        <div className="login-card">
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Welcome</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Access is provided by your Waleed Tech administrator. If you need an account, contact
            your manager — there is no public self-registration.
          </p>

          <div className="mt-8 space-y-3">
            <Link href="/login" className={ui.btnPrimaryFull}>
              Sign in
            </Link>
            <p className="text-center text-xs text-slate-500">
              Already have credentials? Use the sign-in page to reach your portal.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
