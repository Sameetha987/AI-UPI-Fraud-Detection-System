import PrimaryButton from "../ui/PrimaryButton";
import SecondaryButton from "../ui/SecondaryButton";
import HeroIllustration from "./HeroIllustration";
import BackgroundEffects from "./BackgroundEffects";

const features = [
  {
    icon: "shield",
    text: "Explainable AI Decisions",
  },
  {
    icon: "brain",
    text: "Real-Time Fraud Detection",
  },
  {
    icon: "scan",
    text: "Instant Risk Scoring",
  },
];

function FeatureIcon({ type }) {
  if (type === "shield") {
    return (
      <svg
        className="h-5 w-5 text-emerald-400"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6l7-3z" />
        <path d="M8.5 12l2.2 2.2 4.8-5" />
      </svg>
    );
  }

  if (type === "brain") {
    return (
      <svg
        className="h-5 w-5 text-cyan-400"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      >
        <path d="M9 4a3 3 0 0 0-3 3v1a3 3 0 0 0-2 5 3 3 0 0 0 3 5h2" />
        <path d="M15 4a3 3 0 0 1 3 3v1a3 3 0 0 1 2 5 3 3 0 0 1-3 5h-2" />
        <path d="M12 4v16" />
        <path d="M7 9h2M15 9h2M7 15h2M15 15h2" />
      </svg>
    );
  }

  return (
    <svg
      className="h-5 w-5 text-blue-400"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export default function Hero() {
  return (
    <main className="relative isolate overflow-hidden">
      <BackgroundEffects />

      <div className="mx-auto min-h-[calc(100vh-88px)] max-w-7xl px-6 pb-16 pt-14 sm:px-8 lg:px-10 lg:pt-16">
        <div className="grid min-h-[calc(100vh-150px)] items-center gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:gap-4">

          {/* LEFT SIDE */}
          <section className="relative z-10 max-w-2xl">

            {/* Eyebrow */}
            <div className="mb-5 flex items-center gap-2 text-sm font-medium text-slate-400">

            </div>

            {/* Heading */}
            <h1 className="max-w-[600px] text-[52px] font-extrabold leading-[1.04] tracking-[-0.035em] text-white sm:text-[58px] lg:text-[62px]">
              AI Powered
              <br />
              <span className="bg-gradient-to-r from-white via-slate-100 to-cyan-300 bg-clip-text text-transparent">
                UPI Fraud
              </span>
              <br />
              Detection
            </h1>

            {/* Description */}
            <p className="mt-6 max-w-xl text-[17px] leading-7 text-slate-300 sm:text-lg">
              Secure every digital payment using{" "}
              <strong className="font-semibold text-white">
                Explainable AI
              </strong>
              , Machine Learning and Real-Time Risk Analysis.
            </p>

            {/* Buttons */}
            <div className="mt-8 flex flex-wrap gap-4">
              <PrimaryButton>Get Started</PrimaryButton>
              <SecondaryButton>Watch Demo</SecondaryButton>
            </div>

            {/* Features */}
            <div className="mt-9 space-y-4">
              {features.map((feature) => (
                <div
                  key={feature.text}
                  className="flex items-center gap-3 text-[15px] text-slate-300"
                >
                  <FeatureIcon type={feature.icon} />
                  <span>{feature.text}</span>
                </div>
              ))}
            </div>
          </section>

          {/* RIGHT SIDE */}
          <section className="relative flex items-center justify-center lg:justify-end">
            <HeroIllustration />
          </section>

        </div>
      </div>
    </main>
  );
}