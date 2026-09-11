import SurveyForm from "@/components/SurveyForm";
import type { Survey } from "@/lib/surveys";

/** The public page around any survey — shared by / and /<slug>. */
export default function SurveyScreen({ survey }: { survey: Survey }) {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-2xl px-5 py-12 sm:py-20">
      <SurveyForm survey={survey} />
      <footer className="mt-16 border-t border-black/10 pt-6 text-xs text-black/40 dark:border-white/10 dark:text-white/40">
        {survey.footer}
      </footer>
    </main>
  );
}
