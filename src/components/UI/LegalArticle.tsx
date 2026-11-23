import { Link } from 'react-router-dom';

/** Shared layout for the Privacy Policy and Terms pages. */
export const LegalArticle: React.FC<{
  title: string;
  updated: string;
  children: React.ReactNode;
}> = ({ title, updated, children }) => (
  <div className="h-full overflow-auto safe-pad">
    <article className="mx-auto max-w-2xl px-4 py-8 text-sm leading-relaxed text-slate-700 dark:text-slate-300 [&_h2]:mt-6 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-slate-900 dark:[&_h2]:text-white [&_li]:mt-1 [&_p]:mt-3 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5">
      <Link to="/learn" className="font-bold text-lime-700 dark:text-lime-400">
        ← Back
      </Link>
      <h1 className="mt-6 text-2xl font-black text-slate-900 dark:text-white">{title}</h1>
      <p className="text-xs text-slate-500">Last updated: {updated}</p>
      {children}
    </article>
  </div>
);
