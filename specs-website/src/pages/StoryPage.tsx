import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { cachedApi, api } from '../shared/api';
import { storage } from '../shared/appwrite';
import { ArrowLeft, Calendar, User, ExternalLink } from 'lucide-react';
import { formatDate } from '../shared/formatters';

const BUCKET_ID_HIGHLIGHT_IMAGES = import.meta.env.VITE_BUCKET_ID_HIGHLIGHT_IMAGES || 'highlight-images';

const StoryPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [story, setStory] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStory = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const doc = await cachedApi.stories.get(id);
        setStory(doc);
      } catch (err: any) {
        console.error('Error fetching story detail:', err);
        setError(err.message || 'Story not found.');
      } finally {
        setLoading(false);
      }
    };

    fetchStory();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0d6b66] dark:border-teal-400" />
        <p className="text-sm text-slate-500 mt-4 font-semibold tracking-wide">Loading story details...</p>
      </div>
    );
  }

  if (error || !story) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-slate-50 dark:bg-slate-950 px-4 transition-colors duration-300">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="h-16 w-16 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-full flex items-center justify-center mx-auto text-red-500">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Unable to Load Story</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            {error || 'The story you are trying to view does not exist or has been deleted.'}
          </p>
          <button
            onClick={() => navigate('/')}
            className="inline-flex justify-center items-center gap-2 rounded-lg bg-[#0d6b66] hover:bg-[#0b5c58] text-white px-5 py-2.5 text-sm font-semibold transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const imageUrl = story.image_bucket ? storage.getFilePreview(BUCKET_ID_HIGHLIGHT_IMAGES, story.image_bucket, 1200, 630) : null;
  const authorName = story.students?.name || story.author || 'SPECS Contributor';
  const authorInitials = authorName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();

  return (
    <article className="min-h-screen bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 pb-24 transition-colors duration-300">
      {/* Top Banner Navigation */}
      <div className="max-w-4xl mx-auto px-6 pt-8 pb-4">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-bold text-[#0d6b66] dark:text-teal-400 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Stories
        </Link>
      </div>

      {/* Main Title Section */}
      <header className="max-w-3xl mx-auto px-6 py-6 space-y-6">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
          {story.title}
        </h1>

        {/* Story Metadata */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-6 border-y border-slate-100 dark:border-slate-800 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-extrabold text-slate-700 dark:text-slate-350">
              {authorInitials}
            </div>
            <span>{authorName}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-slate-400" />
            <span>{formatDate(story.$createdAt)}</span>
          </div>

          <span className="ml-auto inline-flex items-center rounded-full bg-teal-50 dark:bg-teal-950/20 border border-teal-150 dark:border-teal-900 px-2.5 py-0.5 text-[10px] font-bold text-[#0d6b66] dark:text-teal-350">
            Student Spotlight
          </span>
        </div>
      </header>

      {/* Hero Image */}
      {imageUrl && (
        <div className="max-w-4xl mx-auto px-6 my-6">
          <div className="rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 aspect-video shadow-sm">
            <img src={imageUrl} alt={story.title} className="w-full h-full object-cover" />
          </div>
        </div>
      )}

      {/* Summary Box */}
      {story.post_description && (
        <div className="max-w-3xl mx-auto px-6 mb-8">
          <div className="border-l-4 border-[#0d6b66] dark:border-teal-400 bg-slate-50 dark:bg-slate-900/50 p-5 rounded-r-xl">
            <p className="text-sm sm:text-base font-semibold italic text-slate-700 dark:text-slate-300 leading-relaxed">
              "{story.post_description}"
            </p>
          </div>
        </div>
      )}

      {/* Full Content */}
      <section className="max-w-3xl mx-auto px-6">
        <div className="prose prose-slate dark:prose-invert prose-teal max-w-none text-base sm:text-lg leading-relaxed whitespace-pre-wrap font-normal text-slate-700 dark:text-slate-300">
          {story.post_details || 'No details provided.'}
        </div>

        {/* Links section */}
        {story.related_links && story.related_links.length > 0 && (
          <div className="mt-12 pt-8 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">Related Links</h3>
            <div className="flex flex-col gap-3">
              {story.related_links.map((link: string, idx: number) => (
                <a
                  key={idx}
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[#0d6b66] dark:text-teal-400 hover:underline bg-slate-50 dark:bg-slate-900/40 p-3.5 rounded-xl border border-slate-150 dark:border-slate-800 break-all w-fit"
                >
                  <span>{link}</span>
                  <ExternalLink className="h-4 w-4 shrink-0" />
                </a>
              ))}
            </div>
          </div>
        )}
      </section>
    </article>
  );
};

export default StoryPage;
