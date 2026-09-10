import SurveyForm from "@/components/SurveyForm";

export default function Home() {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-2xl px-5 py-12 sm:py-20">
      <SurveyForm />
      <footer className="mt-16 border-t border-black/10 pt-6 text-xs text-black/40 dark:border-white/10 dark:text-white/40">
        This survey is about your current behaviour, not medical details. Responses will be used only for research.
      </footer>
    </main>
  );
}
