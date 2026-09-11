import type { Metadata } from "next";
import SurveyScreen from "@/components/SurveyScreen";
import { DEFAULT_SURVEY } from "@/lib/surveys";

// `/` stays on the family-health survey: a public link to it is already in
// circulation. Every survey is also reachable at its own /<slug>.
export const metadata: Metadata = {
  title: DEFAULT_SURVEY.title,
  description: DEFAULT_SURVEY.intro,
};

export default function Home() {
  return <SurveyScreen survey={DEFAULT_SURVEY} />;
}
