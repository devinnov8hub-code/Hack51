export interface Scoring{
  scores: [
    {
      criterion_id: string;
      criterion_title: string;
      weight: number;
      score_percent: number;
    }
  ],
  reviewer_notes: string;
}