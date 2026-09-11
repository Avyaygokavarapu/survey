import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SurveyScreen from "@/components/SurveyScreen";
import { SURVEY_LIST, getSurvey } from "@/lib/surveys";

/** Only registered slugs exist; anything else 404s. */
export function generateStaticParams() {
  return SURVEY_LIST.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const survey = getSurvey((await params).slug);
  if (!survey) return {};
  return { title: survey.title, description: survey.intro };
}

export default async function SurveyPage({ params }: { params: Promise<{ slug: string }> }) {
  const survey = getSurvey((await params).slug);
  if (!survey) notFound();
  return <SurveyScreen survey={survey} />;
}
