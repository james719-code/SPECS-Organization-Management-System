import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../shared/api';
import { storage } from '../shared/appwrite';
import { 
  Terminal, Code2, Users, Calendar, ArrowRight, Award, Sparkles, Lightbulb, Check,
  MapPin, Clock, Menu, X, ChevronRight, Mail, Phone, Compass, ShieldCheck, ExternalLink, Sun, Moon, RotateCw,
  BookOpen, GitBranch
} from 'lucide-react';
import { COLLECTION_ID_ACCOUNTS, COLLECTION_ID_STUDENTS, BUCKET_ID_EVENT_IMAGES } from '../shared/constants';
const BUCKET_ID_PICTURES = (import.meta.env.VITE_BUCKET_ID_PICTURES as string) || 'pictures';
import { SITE_LEADERSHIP, FAQS } from '../data/landingData';
import MockTerminal from '../components/MockTerminal';

interface LandingPageProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ theme, toggleTheme }) => {
  const [events, setEvents] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingStories, setLoadingStories] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'upcoming' | 'completed'>('all');
  const [aboutTab, setAboutTab] = useState<'mission' | 'officers' | 'team'>('mission');
  const [faqOpen, setFaqOpen] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Dynamic telemetry stats state
  const [stats, setStats] = useState({
    members: 0,
    events: 0,
    stories: 0,
    loading: true,
    error: false
  });

  const [logs, setLogs] = useState<string[]>([
    "fetch specs-database-nodes --verbose",
    "Appwrite Database clusters connected successfully.",
    "Client container handshake established."
  ]);

  // Query live portal stats directly from Appwrite (with mock fallback)
  const fetchStats = async () => {
    setStats(prev => ({ ...prev, loading: true }));
    setLogs(prev => [...prev, "Syncing telemetry nodes..."]);
    try {
      const [membersRes, eventsRes, storiesRes] = await Promise.all([
        api.students.listProfiles({ limit: 1 }),
        api.events.list({ limit: 1 }),
        api.stories.list({ limit: 1 })
      ]);
      
      setStats({
        members: membersRes.total || 0,
        events: eventsRes.total || 0,
        stories: storiesRes.total || 0,
        loading: false,
        error: false
      });
      setLogs([
        "fetch specs-database-nodes --verbose",
        "Appwrite Database clusters connected successfully.",
        `Telemetry synced: ${membersRes.total || 0} students, ${eventsRes.total || 0} events active.`
      ]);
    } catch (err) {
      console.warn("Failed to fetch live stats from API, trying mock data...", err);
      try {
        const { mockStudents, mockEvents, mockStories } = await import('../shared/mock/mockData.js');
        const membersCount = mockStudents?.length || 0;
        const eventsCount = mockEvents?.length || 0;
        const storiesCount = mockStories?.length || 0;
        setStats({
          members: membersCount,
          events: eventsCount,
          stories: storiesCount,
          loading: false,
          error: false
        });
        setLogs([
          "fetch specs-database-nodes --verbose",
          "API Node connection timed out. Handshake fallback to local Cache.",
          `Telemetry synced (Cached): ${membersCount} students, ${eventsCount} events loaded.`
        ]);
      } catch (_) {
        setStats(prev => ({ ...prev, loading: false, error: true }));
        setLogs(prev => [...prev, "Sync error: Fallback cache failed."]);
      }
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // Set Title on Load
  useEffect(() => {
    document.title = "SPECS Portal | College of Engineering and Computational Sciences";
  }, []);

  // Fetch Events and Stories with Fallback
  useEffect(() => {
    let isMounted = true;

    async function fetchEvents() {
      try {
        const eventsRes = await api.events.list({ limit: 20 });
        if (isMounted) {
          setEvents(eventsRes.documents || []);
          setLoadingEvents(false);
        }
      } catch (err) {
        console.error("Error fetching events:", err);
        if (isMounted) {
          try {
            const { mockEvents } = await import('../shared/mock/mockData.js');
            setEvents(mockEvents || []);
          } catch (_) {
            setEvents([]);
          }
          setLoadingEvents(false);
        }
      }
    }

    async function fetchStories() {
      try {
        const storiesRes = await api.stories.list({ limit: 10 });
        if (isMounted) {
          const accepted = (storiesRes.documents || []).filter((s: any) => s.isAccepted);
          setStories(accepted);
          setLoadingStories(false);
        }
      } catch (err) {
        console.error("Error fetching stories:", err);
        if (isMounted) {
          try {
            const { mockStories } = await import('../shared/mock/mockData.js');
            const accepted = (mockStories || []).filter((s: any) => s.isAccepted);
            setStories(accepted);
          } catch (_) {
            setStories([]);
          }
          setLoadingStories(false);
        }
      }
    }

    fetchEvents();
    fetchStories();

    return () => {
      isMounted = false;
    };
  }, []);

  // Format date helper
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return { day: '--', month: '---', year: '----', full: 'Date TBD' };
    try {
      const d = new Date(dateStr);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return {
        day: d.getDate().toString(),
        month: months[d.getMonth()],
        year: d.getFullYear().toString(),
        full: d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      };
    } catch (e) {
      return { day: '--', month: '---', year: '----', full: 'Date TBD' };
    }
  };

  // Helper to fetch picture URL or fallback
  const getPictureUrl = (fileId: string, size = 150) => {
    if (!fileId) return null;
    try {
      if (storage && typeof storage.getFilePreview === 'function') {
        return storage.getFilePreview(BUCKET_ID_PICTURES, fileId, size, size, 'center', 90);
      }
      return null;
    } catch (e) {
      return null;
    }
  };
 
  const getEventImageUrl = (fileId: string) => {
    if (!fileId) return null;
    try {
      if (storage && typeof storage.getFilePreview === 'function') {
        return storage.getFilePreview(BUCKET_ID_EVENT_IMAGES || 'event-images', fileId, 400, 250, 'center', 90);
      }
      return null;
    } catch (e) {
      return null;
    }
  };

  const adviserUrl = getPictureUrl(SITE_LEADERSHIP.adviser.fileId, 200);

  // Filter events based on active tab
  const filteredEvents = events.filter(event => {
    if (activeTab === 'upcoming') return !event.event_ended;
    if (activeTab === 'completed') return event.event_ended;
    return true;
  });

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans scroll-smooth">
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 dark:bg-slate-900/80 border-b border-slate-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between transition-all duration-300">
        <div className="flex items-center gap-3">
          <img src="/logo.webp" alt="SPECS Logo" className="h-10 w-10 object-contain rounded-xl shadow-md" />
          <div className="flex flex-col">
            <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white leading-none">SPECS Portal</span>
            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-505 tracking-wider uppercase mt-0.5">College of Engineering and Computational Sciences</span>
          </div>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6">
          <a href="#about" className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-[#0d6b66] dark:hover:text-[#0ba8a0] transition-colors relative py-1 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 hover:after:w-full after:bg-[#0d6b66] dark:after:bg-[#0ba8a0] after:transition-all">About</a>
          <a href="#events" className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-[#0d6b66] dark:hover:text-[#0ba8a0] transition-colors relative py-1 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 hover:after:w-full after:bg-[#0d6b66] dark:after:bg-[#0ba8a0] after:transition-all">Events</a>
          <a href="#stories" className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-[#0d6b66] dark:hover:text-[#0ba8a0] transition-colors relative py-1 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 hover:after:w-full after:bg-[#0d6b66] dark:after:bg-[#0ba8a0] after:transition-all">Stories</a>
          
          {/* Theme Toggle Button */}
          <button 
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ml-2"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="h-5 w-5 text-amber-400" /> : <Moon className="h-5 w-5 text-indigo-600" />}
          </button>
          
          <Link to="/login" className="rounded-xl bg-[#0d6b66] hover:bg-[#094d4a] hover:shadow-lg hover:shadow-teal-900/10 px-5 py-2.5 text-sm font-bold text-white transition-all transform hover:-translate-y-0.5">
            Enter Portal
          </Link>
        </nav>

        {/* Mobile menu and theme buttons */}
        <div className="md:hidden flex items-center gap-2">
          <button 
            onClick={toggleTheme}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="h-5 w-5 text-amber-400" /> : <Moon className="h-5 w-5 text-indigo-600" />}
          </button>
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </header>

      {/* Mobile Nav Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-[73px] z-40 bg-white/95 dark:bg-slate-955/95 dark:bg-slate-950/95 backdrop-blur-sm flex flex-col p-6 space-y-6 animate-fade-in border-t border-slate-100 dark:border-slate-800">
          <a 
            href="#about" 
            onClick={() => setMobileMenuOpen(false)}
            className="text-lg font-bold text-slate-800 dark:text-white hover:text-[#0d6b66] flex items-center justify-between"
          >
            About SPECS <ChevronRight className="h-5 w-5 text-slate-400" />
          </a>
          <a 
            href="#events" 
            onClick={() => setMobileMenuOpen(false)}
            className="text-lg font-bold text-slate-800 dark:text-white hover:text-[#0d6b66] flex items-center justify-between"
          >
            Events Calendar <ChevronRight className="h-5 w-5 text-slate-400" />
          </a>
          <a 
            href="#stories" 
            onClick={() => setMobileMenuOpen(false)}
            className="text-lg font-bold text-slate-800 dark:text-white hover:text-[#0d6b66] flex items-center justify-between"
          >
            Student Stories <ChevronRight className="h-5 w-5 text-slate-400" />
          </a>
          <Link 
            to="/login" 
            onClick={() => setMobileMenuOpen(false)}
            className="w-full text-center rounded-xl bg-[#0d6b66] py-3 text-base font-bold text-white hover:bg-[#094d4a] transition-all shadow-md"
          >
            Login / Sign Up
          </Link>
        </div>
      )}

      {/* 2. HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-teal-50/30 to-emerald-50/20 dark:from-slate-950 dark:via-[#042422] dark:to-[#021312] text-slate-800 dark:text-white py-24 px-6 sm:px-12 md:px-20 lg:py-32 transition-colors duration-300">
        {/* Dot Matrix Pattern Overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(#0d6b6612_1px,transparent_1px)] dark:bg-[radial-gradient(#2dd4bf08_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_80%,transparent_100%)] pointer-events-none"></div>

        {/* Diagonal Tech Grid Lines */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808005_1px,transparent_1px),linear-gradient(to_bottom,#80808005_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none"></div>

        {/* Ambient Pulsing Circles with Opacity */}
        <div className="absolute -top-24 -right-24 h-[400px] w-[400px] rounded-full bg-teal-500/5 dark:bg-teal-400/[0.02] border border-teal-500/10 dark:border-teal-400/10 pointer-events-none animate-pulse duration-[8000ms]"></div>
        <div className="absolute -top-12 -right-12 h-[220px] w-[220px] rounded-full bg-emerald-500/5 dark:bg-emerald-400/[0.01] border border-emerald-500/10 dark:border-emerald-400/10 pointer-events-none animate-pulse duration-[6000ms]"></div>
        
        <div className="absolute -bottom-20 -left-20 h-[350px] w-[350px] rounded-full bg-cyan-500/5 dark:bg-cyan-400/[0.02] border border-cyan-500/10 dark:border-cyan-400/10 pointer-events-none animate-pulse duration-[7000ms]"></div>
        <div className="absolute -bottom-10 -left-10 h-[180px] w-[180px] rounded-full bg-teal-500/5 dark:bg-teal-400/[0.01] border border-teal-500/10 dark:border-teal-400/10 pointer-events-none animate-pulse duration-[5000ms]"></div>

        {/* Distributed Floating Bubble Circles */}
        <div className="absolute top-10 left-1/3 h-[120px] w-[120px] rounded-full bg-emerald-500/5 dark:bg-emerald-400/[0.01] border border-emerald-500/10 dark:border-emerald-400/5 pointer-events-none animate-pulse duration-[9000ms]"></div>
        <div className="absolute top-1/2 left-1/4 h-[80px] w-[80px] rounded-full bg-cyan-500/5 dark:bg-cyan-400/[0.01] border border-cyan-500/10 dark:border-cyan-400/5 pointer-events-none animate-pulse duration-[7500ms]"></div>
        <div className="absolute bottom-1/3 right-1/3 h-[150px] w-[150px] rounded-full bg-teal-500/5 dark:bg-teal-400/[0.01] border border-teal-500/10 dark:border-teal-400/5 pointer-events-none animate-pulse duration-[8500ms]"></div>
        <div className="absolute top-1/4 right-1/4 h-[100px] w-[100px] rounded-full bg-teal-500/5 dark:bg-teal-400/[0.01] border border-teal-500/10 dark:border-teal-400/5 pointer-events-none animate-pulse duration-[10000ms]"></div>
        
        {/* Floating tech background shapes */}
        <div className="absolute top-1/3 left-10 text-slate-200 dark:text-slate-850 opacity-20 dark:opacity-10 font-mono text-9xl select-none pointer-events-none font-black hidden lg:block">&lt;/&gt;</div>
        <div className="absolute bottom-1/4 right-12 text-slate-200 dark:text-slate-850 opacity-15 dark:opacity-5 font-mono text-[140px] select-none pointer-events-none font-black hidden lg:block">&#123;&#125;</div>
        
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          {/* Hero Left Content */}
          <div className="lg:col-span-7 flex flex-col items-start text-left">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.1] mb-6">
              Society of Programmers and <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0d6b66] via-teal-600 to-cyan-600 dark:from-teal-400 dark:via-emerald-300 dark:to-cyan-300">Enthusiasts</span> in Computer Science
            </h1>
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed mb-10">
              Welcome to the official SPECS Portal. A dedicated digital platform engineered for PSU computing students to manage member profiles, check attendance, settle dues, and showcase software portfolios.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <Link to="/login" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0d6b66] hover:bg-[#094d4a] text-white dark:bg-teal-500 dark:hover:bg-teal-400 dark:text-slate-950 font-bold px-8 py-4 shadow-lg shadow-teal-700/10 dark:shadow-teal-500/20 hover:shadow-teal-900/20 dark:hover:shadow-teal-500/35 hover:-translate-y-0.5 transition-all w-full sm:w-auto">
                Enter Portal <ArrowRight className="h-5 w-5" />
              </Link>
              <a href="#about" className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 dark:border-white/20 dark:bg-white/5 dark:hover:bg-white/10 dark:text-white font-bold px-8 py-4 hover:-translate-y-0.5 transition-all w-full sm:w-auto shadow-sm dark:shadow-none">
                Learn More
              </a>
            </div>
          </div>

          {/* Hero Right Mockup */}
          <div className="lg:col-span-5 flex justify-center w-full relative">
            <div className="w-full max-w-[420px] rounded-2xl border border-slate-200 dark:border-white/10 bg-white/90 dark:bg-slate-955/70 dark:bg-slate-950/70 p-5 shadow-xl dark:shadow-2xl backdrop-blur-md transform hover:scale-[1.02] transition-transform duration-300 relative overflow-hidden group">
              {/* Mockup Topbar */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-4 mb-4">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-500/80"></div>
                  <div className="h-3 w-3 rounded-full bg-yellow-500/80"></div>
                  <div className="h-3 w-3 rounded-full bg-green-500/80"></div>
                </div>
                <span className="text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">SPECS PORTAL SECURE</span>
                <div className="h-1.5 w-12 rounded bg-slate-100 dark:bg-white/10"></div>
              </div>

              {/* Mockup Dashboard Cards */}
              <div className="space-y-3.5">
                {/* Profile Widget */}
                <div className="rounded-xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-[#0d6b66] text-white flex items-center justify-center text-xs font-bold shadow-sm">
                      JD
                    </div>
                    <div>
                      <span className="text-xs font-bold block text-slate-800 dark:text-white">John Doe</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">BSCS - 3rd Year</span>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-[#0d6b66] dark:text-teal-400 bg-[#0d6b66]/10 dark:bg-teal-400/10 px-2 py-0.5 rounded-full">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#0d6b66] dark:bg-teal-400 animate-pulse"></span>
                    Volunteer
                  </span>
                </div>

                {/* Progress Widget */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 p-3">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-medium uppercase tracking-wider">Attendance Rate</span>
                    <span className="text-lg font-extrabold text-slate-800 dark:text-white mt-1 block">88.5%</span>
                    <div className="w-full bg-slate-250 bg-slate-200 dark:bg-white/10 h-1 rounded-full mt-2 overflow-hidden">
                      <div className="bg-[#0d6b66] dark:bg-teal-450 dark:bg-teal-400 h-full rounded-full" style={{ width: '88.5%' }}></div>
                    </div>
                  </div>
                  <div className="rounded-xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 p-3">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-medium uppercase tracking-wider">Active Events</span>
                    <span className="text-lg font-extrabold text-slate-800 dark:text-white mt-1 block">2 Upcoming</span>
                    <span className="text-[9px] text-[#0d6b66] dark:text-teal-400 block font-bold mt-1.5">Next: Feb 15, 2026</span>
                  </div>
                </div>

                {/* Payment Widget */}
                <div className="rounded-xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-350">Membership Fee Q1</span>
                  </div>
                  <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-100/60 dark:bg-emerald-400/10 px-2 py-1 rounded-lg flex items-center gap-1">
                    Paid <Check className="h-3 w-3" />
                  </span>
                </div>

                {/* Mini terminal */}
                <MockTerminal />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. ABOUT SECTION (Tabbed Core Layout) */}
      <section id="about" className="py-24 px-6 sm:px-12 md:px-20 bg-slate-50 dark:bg-slate-900/40 relative overflow-hidden transition-colors duration-300">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#0d6b66] dark:text-teal-400 mb-3">WHO WE ARE</h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
              Fostering Technical Competency and Innovation in Computer Science
            </p>
            <div className="w-12 h-1 bg-[#0d6b66] dark:bg-teal-500 mx-auto mt-4 rounded-full"></div>
            
            {/* Subsection Tab Buttons */}
            <div className="flex bg-slate-200/60 dark:bg-slate-800 rounded-2xl p-1 mt-10 max-w-lg mx-auto gap-1 border border-slate-300 dark:border-slate-700">
              <button 
                onClick={() => setAboutTab('mission')}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${aboutTab === 'mission' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
              >
                Our Identity
              </button>
              <button 
                onClick={() => setAboutTab('officers')}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${aboutTab === 'officers' ? 'bg-white dark:bg-slate-900 text-[#0d6b66] dark:text-teal-400 shadow' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
              >
                Student Leadership
              </button>
              <button 
                onClick={() => setAboutTab('team')}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${aboutTab === 'team' ? 'bg-white dark:bg-slate-900 text-[#0d6b66] dark:text-teal-400 shadow' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
              >
                Adviser & Tech Team
              </button>
            </div>
          </div>

          {/* TAB 1: IDENTITY (Mission, Vision, Specialization) */}
          {aboutTab === 'mission' && (
            <div className="space-y-20 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Mission Card */}
                <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col group hover:-translate-y-1">
                  <div className="h-12 w-12 rounded-xl bg-teal-50 dark:bg-teal-950/20 text-[#0d6b66] dark:text-teal-400 flex items-center justify-center mb-6 group-hover:bg-[#0d6b66] group-hover:text-white dark:group-hover:bg-teal-500 dark:group-hover:text-slate-950 transition-colors duration-300">
                    <Compass className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Our Mission</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                    To cultivate an environment of technical advancement, collaboration, and peer learning. We empower Computer Science students at the College of Engineering and Computational Sciences with advanced industry skills to succeed as global developers.
                  </p>
                </div>

                {/* Vision Card */}
                <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col group hover:-translate-y-1">
                  <div className="h-12 w-12 rounded-xl bg-teal-50 dark:bg-teal-950/20 text-[#0d6b66] dark:text-teal-400 flex items-center justify-center mb-6 group-hover:bg-[#0d6b66] group-hover:text-white dark:group-hover:bg-teal-500 dark:group-hover:text-slate-950 transition-colors duration-300">
                    <Lightbulb className="h-6 w-6 animate-pulse" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Our Vision</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                    To be the regional hub of excellence for student software engineering, innovative project development, and academic-industry collaborative research in Bicol region.
                  </p>
                </div>

                {/* Values Card */}
                <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col group hover:-translate-y-1">
                  <div className="h-12 w-12 rounded-xl bg-teal-50 dark:bg-teal-950/20 text-[#0d6b66] dark:text-teal-400 flex items-center justify-center mb-6 group-hover:bg-[#0d6b66] group-hover:text-white dark:group-hover:bg-teal-500 dark:group-hover:text-slate-950 transition-colors duration-300">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Core Values</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                    We believe in code integrity, diversity, community leadership, open-source contribution, and consistent self-improvement through active programming.
                  </p>
                </div>
              </div>

              {/* Telemetry & Core Principles Section */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                {/* Left Card: Live Telemetry Dashboard */}
                <div className="lg:col-span-7 rounded-2xl bg-[#094844] dark:bg-slate-900 border border-teal-500/20 dark:border-slate-800 p-8 shadow-xl relative overflow-hidden group flex flex-col justify-between">
                  {/* Glowing background details */}
                  <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-teal-500/10 to-transparent rounded-bl-full pointer-events-none"></div>
                  <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-emerald-500/5 blur-xl pointer-events-none"></div>

                  <div>

                    <h3 className="text-xl font-bold mb-3 tracking-tight text-white">
                      Transparent Portal Activity
                    </h3>
                    <p className="text-xs text-teal-100/70 dark:text-slate-400 leading-relaxed mb-8 max-w-lg">
                      Our portal displays live telemetry data retrieved directly from the database, showcasing real-time counts of active members, events, and student stories.
                    </p>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-left">
                      <div>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Users className="h-4 w-4 text-teal-350 dark:text-teal-400" />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-teal-300">Students</span>
                        </div>
                        {stats.loading ? (
                          <div className="h-9 w-16 bg-white/10 rounded animate-pulse"></div>
                        ) : (
                          <span className="block text-3xl font-extrabold tracking-tight text-white">
                            {stats.members}
                          </span>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Calendar className="h-4 w-4 text-teal-350 dark:text-teal-400" />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-teal-300">Events</span>
                        </div>
                        {stats.loading ? (
                          <div className="h-9 w-16 bg-white/10 rounded animate-pulse"></div>
                        ) : (
                          <span className="block text-3xl font-extrabold tracking-tight text-white">
                            {stats.events}
                          </span>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <BookOpen className="h-4 w-4 text-teal-350 dark:text-teal-400" />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-teal-300">Stories</span>
                        </div>
                        {stats.loading ? (
                          <div className="h-9 w-16 bg-white/10 rounded animate-pulse"></div>
                        ) : (
                          <span className="block text-3xl font-extrabold tracking-tight text-white">
                            {stats.stories}
                          </span>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <GitBranch className="h-4 w-4 text-teal-350 dark:text-teal-400" />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-teal-300">Version</span>
                        </div>
                        <span className="block text-3xl font-extrabold tracking-tight text-white">
                          v2.2
                        </span>
                      </div>
                    </div>

                    {/* Platform Telemetry Log Feed */}
                    <div className="mt-8 p-4 rounded-xl bg-black/25 dark:bg-black/40 border border-teal-500/10 dark:border-slate-800 font-mono text-[10px] text-teal-300/80 space-y-1.5 shadow-inner">
                      <div className="flex items-center justify-between border-b border-teal-500/10 dark:border-slate-800/80 pb-1.5 mb-2 text-teal-400">
                        <span className="font-bold flex items-center gap-1.5">
                          <Terminal className="h-3.5 w-3.5" /> Telemetry Log Feed
                        </span>
                        <span className="flex items-center gap-1 text-[9px]">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          listening
                        </span>
                      </div>
                      {logs.slice(-3).map((log, idx) => (
                        <div key={idx} className="flex items-start gap-1.5 leading-relaxed truncate">
                          <span className="text-teal-500/50 flex-shrink-0">[$]</span>
                          <span className="truncate">{log}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-8 pt-4 border-t border-teal-500/10 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
                    <span className="text-[9px] font-mono text-teal-200/50 dark:text-slate-500">
                      Query executed via Appwrite API nodes
                    </span>
                    <button 
                      onClick={fetchStats}
                      disabled={stats.loading}
                      className="inline-flex items-center gap-1.5 text-[9px] font-bold text-teal-200 hover:text-white dark:text-slate-400 dark:hover:text-white transition-colors bg-teal-500/15 hover:bg-teal-500/25 dark:bg-slate-800 dark:hover:bg-slate-700 px-2.5 py-1 rounded-md border border-teal-500/20 dark:border-slate-700 disabled:opacity-50"
                    >
                      <RotateCw className={`h-3 w-3 ${stats.loading ? 'animate-spin' : ''}`} /> Refresh Telemetry
                    </button>
                  </div>
                </div>

                {/* Right Card: Platform Philosophy / Principles */}
                <div className="lg:col-span-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-8 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-widest text-[#0d6b66] dark:text-teal-400 mb-3">Our Principles</h4>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Designed For Devs, By Devs</h3>
                    
                    <div className="space-y-4">
                      <div className="flex gap-3">
                        <div className="h-5 w-5 rounded bg-teal-50 dark:bg-teal-950/20 text-[#0d6b66] dark:text-teal-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="h-3 w-3" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className="text-xs font-bold text-slate-800 dark:text-white">Open Source Philosophy</h5>
                            <a 
                              href="https://github.com/james719-code/SPECS-Organization-Management-System" 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-[10px] font-bold text-[#0d6b66] dark:text-teal-400 hover:underline inline-flex items-center gap-0.5"
                            >
                              Contribute <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          </div>
                          <p className="text-[11px] text-slate-550 dark:text-slate-400 leading-relaxed mt-0.5">
                            We encourage BSCS students to contribute new features, refine workflows, and help maintain this web portal.
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <div className="h-5 w-5 rounded bg-teal-50 dark:bg-teal-950/20 text-[#0d6b66] dark:text-teal-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="h-3 w-3" />
                        </div>
                        <div>
                          <h5 className="text-xs font-bold text-slate-800 dark:text-white">Active Peer Mentorship</h5>
                          <p className="text-[11px] text-slate-550 dark:text-slate-400 leading-relaxed mt-0.5">
                            Lower and upperclassmen collaborate in hands-on workshops, sharing coding knowledge and project guidance.
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <div className="h-5 w-5 rounded bg-teal-50 dark:bg-teal-950/20 text-[#0d6b66] dark:text-teal-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="h-3 w-3" />
                        </div>
                        <div>
                          <h5 className="text-xs font-bold text-slate-800 dark:text-white">Practical & Hands-on</h5>
                          <p className="text-[11px] text-slate-550 dark:text-slate-400 leading-relaxed mt-0.5">
                            We focus on building real projects, solving algorithmic challenges, and creating tangible value for our local student community.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">Want to build systems like this?</span>
                    <div className="flex items-center gap-3">
                      <a 
                        href="https://github.com/james719-code/SPECS-Organization-Management-System" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-[#0d6b66] dark:text-teal-400 hover:underline"
                      >
                        Contribute on GitHub <ExternalLink className="h-3 w-3" />
                      </a>
                      <span className="text-slate-200 dark:text-slate-800">|</span>
                      <a href="#events" className="inline-flex items-center gap-1 text-[10px] font-bold text-[#0d6b66] dark:text-teal-400 hover:underline">
                        View our events <ArrowRight className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Areas of Focus */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-8 md:p-12 shadow-sm">
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white text-center mb-8">Areas of Specialized Focus</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="p-4 flex flex-col items-center text-center">
                    <Code2 className="h-10 w-10 text-[#0d6b66] dark:text-teal-400 mb-3" />
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Fullstack Development</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">Javascript, React, Node, Web Architectures</p>
                  </div>
                  <div className="p-4 flex flex-col items-center text-center">
                    <Terminal className="h-10 w-10 text-[#0d6b66] dark:text-teal-400 mb-3" />
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Competitive Coding</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">Algorithms, Data Structures, Problem Solving</p>
                  </div>
                  <div className="p-4 flex flex-col items-center text-center">
                    <Users className="h-10 w-10 text-[#0d6b66] dark:text-teal-400 mb-3" />
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Community Mentorship</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">Peer tutorials, open learning sessions</p>
                  </div>
                  <div className="p-4 flex flex-col items-center text-center">
                    <Sparkles className="h-10 w-10 text-[#0d6b66] dark:text-teal-400 mb-3" />
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Emerging Technologies</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">AI Integration, Cloud Architectures, Web3</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LEADERSHIP (Faculty Advisor & Officers Grid) */}
          {aboutTab === 'officers' && (
            <div className="space-y-16 animate-fade-in">
              {/* Adviser Spotlight Card */}
              <div className="max-w-xl mx-auto rounded-3xl bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-950 border border-slate-150 dark:border-white/10 p-8 md:p-10 text-center md:text-left shadow-xl hover:shadow-2xl hover:shadow-teal-900/5 dark:hover:shadow-teal-500/5 hover:-translate-y-1.5 transition-all duration-500 relative overflow-hidden group hover:border-[#0d6b66]/30 dark:hover:border-teal-500/30">
                {/* Bubble Circle background elements */}
                <div className="absolute -top-10 -left-10 w-32 h-32 rounded-full bg-gradient-to-br from-teal-500/10 to-[#0d6b66]/10 dark:from-teal-500/5 dark:to-teal-955/20 blur-sm pointer-events-none group-hover:scale-110 transition-transform duration-700"></div>
                <div className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500/10 to-teal-400/10 dark:from-emerald-500/5 dark:to-teal-900/10 blur-xs pointer-events-none group-hover:scale-115 transition-transform duration-700"></div>
                <div className="absolute top-1/4 right-1/4 w-12 h-12 rounded-full border border-teal-500/10 dark:border-teal-500/5 pointer-events-none group-hover:translate-y-2 transition-transform duration-700"></div>
                <div className="absolute bottom-1/3 left-10 w-8 h-8 rounded-full border border-emerald-500/15 dark:border-emerald-500/5 pointer-events-none group-hover:-translate-y-2 transition-transform duration-700"></div>

                {/* Premium Glow effect behind image */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[200px] w-[200px] rounded-full bg-gradient-to-tr from-teal-400/10 to-emerald-400/15 dark:from-teal-500/5 dark:to-emerald-500/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
                
                {/* Corner Accent Line */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-teal-500/10 to-transparent rounded-bl-full group-hover:scale-110 transition-transform duration-500 pointer-events-none"></div>

                <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                  {/* Avatar with offset border and hover rotation */}
                  <div className="relative flex-shrink-0">
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-[#0d6b66] to-teal-400 opacity-20 blur-md group-hover:opacity-30 transition-opacity duration-300 pointer-events-none"></div>
                    {adviserUrl ? (
                      <img 
                        src={adviserUrl} 
                        alt={SITE_LEADERSHIP.adviser.name} 
                        className="h-32 w-32 rounded-2xl object-cover relative z-10 border-2 border-white dark:border-slate-800 shadow-lg ring-4 ring-teal-500/20 group-hover:ring-teal-500/45 transition-all duration-305 group-hover:scale-105"
                      />
                    ) : (
                      <div className="h-32 w-32 rounded-2xl bg-teal-50 dark:bg-slate-800 text-[#0d6b66] dark:text-teal-400 font-extrabold flex items-center justify-center text-5xl relative z-10 border-2 border-white dark:border-slate-800 shadow-lg ring-4 ring-teal-500/20 group-hover:ring-teal-500/45 transition-all duration-305">
                        {SITE_LEADERSHIP.adviser.name.split(' ').map(n => n[0]).join('')}
                      </div>
                    )}
                  </div>

                  {/* Adviser Details */}
                  <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left">
                    <h4 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white mb-1.5 tracking-tight group-hover:text-[#0d6b66] dark:group-hover:text-teal-400 transition-colors duration-300">
                      {SITE_LEADERSHIP.adviser.name}
                    </h4>
                    
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-505 tracking-wider uppercase mb-4">
                      {SITE_LEADERSHIP.adviser.position}
                    </p>

                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-sm mb-5 font-medium italic">
                      "Guiding the next generation of computing leaders, software engineers, and technology innovators."
                    </p>

                    {/* Affiliation Badge */}
                    <div className="w-full pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-center md:justify-start gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-400 border border-slate-200 dark:border-slate-700/60 shadow-inner">
                        <Users className="h-3.5 w-3.5 text-[#0d6b66] dark:text-teal-400" /> 
                        College of Engineering and Computational Sciences Faculty
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Officers Grid */}
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white text-center mb-10">Officers & Representatives</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                  {SITE_LEADERSHIP.officers.map((off, idx) => {
                    const avatarUrl = getPictureUrl(off.fileId, 120);
                    return (
                      <div 
                        key={idx}
                        className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 p-5 text-center shadow-sm hover:shadow-md transition-all group hover:-translate-y-0.5 duration-200"
                      >
                        {avatarUrl ? (
                          <img 
                            src={avatarUrl} 
                            alt={off.name}
                            className="h-20 w-20 rounded-full object-cover mx-auto mb-4 border-2 border-[#0d6b66] dark:border-teal-500 p-0.5"
                          />
                        ) : (
                          <div className="h-20 w-20 rounded-full bg-teal-50 dark:bg-slate-800 text-[#0d6b66] dark:text-teal-400 font-bold flex items-center justify-center text-lg mx-auto mb-4 border border-teal-100 dark:border-teal-900/50">
                            {off.name.split(' ').slice(0, 2).map(n => n[0]).join('')}
                          </div>
                        )}
                        <h5 className="font-extrabold text-slate-900 dark:text-white text-sm tracking-tight mb-1 truncate">{off.name}</h5>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">{off.position}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TECH TEAM (Publicity & Developers) */}
          {aboutTab === 'team' && (
            <div className="space-y-16 animate-fade-in">
              {/* Developers Segment */}
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white text-center mb-8">Technical Developers</h3>
                <div className="max-w-xl mx-auto">
                  {SITE_LEADERSHIP.developers.map((dev, idx) => {
                    const devPic = getPictureUrl(dev.fileId, 150);
                    return (
                      <div 
                        key={idx}
                        className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 shadow-sm flex flex-col md:flex-row items-center gap-6 hover:shadow-md transition-shadow"
                      >
                        {devPic ? (
                          <img 
                            src={devPic} 
                            alt={dev.name} 
                            className="h-24 w-24 rounded-full object-cover border-4 border-teal-500 dark:border-teal-400 p-0.5 flex-shrink-0"
                          />
                        ) : (
                          <div className="h-24 w-24 rounded-full bg-teal-50 dark:bg-slate-800 text-[#0d6b66] dark:text-teal-400 font-extrabold flex items-center justify-center text-3xl mx-auto flex-shrink-0 border border-teal-100 dark:border-teal-900/50">
                            {dev.name.split(' ').slice(0,2).map(n => n[0]).join('')}
                          </div>
                        )}
                        <div className="flex-grow text-center md:text-left">
                          <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-1">{dev.name}</h4>
                          <p className="text-xs font-bold text-[#0d6b66] dark:text-teal-400 mb-3">{dev.course} • {dev.year}</p>
                          <blockquote className="text-xs italic text-slate-500 dark:text-slate-400 border-l-2 border-slate-200 dark:border-slate-800 pl-3 py-1">
                            "{dev.quote}"
                          </blockquote>
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold bg-teal-50 dark:bg-teal-950/20 text-[#0d6b66] dark:text-teal-400 mt-4 border border-teal-100 dark:border-teal-900/30">
                            <Code2 className="h-3 w-3" /> Core Technical Lead
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Publicity/Media Segment */}
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white text-center mb-8">Publicity and Media Team</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6">
                  {SITE_LEADERSHIP.publicityAndMedia.map((pub, idx) => {
                    const avatarUrl = getPictureUrl(pub.fileId, 120);
                    return (
                      <div 
                        key={idx}
                        className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-805/85 p-4 text-center shadow-sm hover:shadow-md transition-all"
                      >
                        {avatarUrl ? (
                          <img 
                            src={avatarUrl} 
                            alt={pub.name}
                            className="h-16 w-16 rounded-full object-cover mx-auto mb-3 border border-[#0d6b66] p-0.5"
                          />
                        ) : (
                          <div className="h-16 w-16 rounded-full bg-teal-50 dark:bg-slate-800 text-[#0d6b66] dark:text-teal-450 font-bold flex items-center justify-center text-base mx-auto mb-3 border border-teal-100 dark:border-teal-900/50">
                            {pub.name.split(' ').slice(0, 2).map(n => n[0]).join('')}
                          </div>
                        )}
                        <h5 className="font-bold text-slate-900 dark:text-white text-xs tracking-tight mb-0.5 truncate">{pub.name}</h5>
                        <p className="text-[9px] text-slate-500 dark:text-slate-400 font-medium">{pub.position}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 4. EVENTS SECTION */}
      <section id="events" className="py-24 px-6 sm:px-12 md:px-20 bg-white dark:bg-slate-950 border-t border-b border-slate-100 dark:border-slate-900 transition-colors duration-300">
        <div className="max-w-7xl mx-auto">
          {/* Section header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
            <div className="text-left">
              <h2 className="text-xs font-bold uppercase tracking-widest text-[#0d6b66] dark:text-teal-400 mb-3">EVENTS CALENDAR</h2>
              <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
                Our Upcoming & Concluded Assemblies
              </h3>
              <div className="w-12 h-1 bg-[#0d6b66] dark:bg-teal-500 mt-4 rounded-full"></div>
            </div>

            {/* Filter Tabs */}
            <div className="flex bg-slate-100 dark:bg-slate-900 rounded-xl p-1 mt-6 md:mt-0 gap-1 self-start md:self-auto border border-slate-200 dark:border-slate-800">
              <button 
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'all' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
              >
                All Events
              </button>
              <button 
                onClick={() => setActiveTab('upcoming')}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'upcoming' ? 'bg-white dark:bg-slate-800 text-[#0d6b66] dark:text-teal-400 shadow' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
              >
                Upcoming
              </button>
              <button 
                onClick={() => setActiveTab('completed')}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'completed' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
              >
                Completed
              </button>
            </div>
          </div>

          {/* Loading Indicator */}
          {loadingEvents ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2].map(idx => (
                <div key={idx} className="h-48 rounded-2xl bg-slate-100 dark:bg-slate-900 animate-pulse border border-slate-200 dark:border-slate-800"></div>
              ))}
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-12 text-center bg-slate-50 dark:bg-slate-900/20 max-w-md mx-auto">
              <Calendar className="h-8 w-8 text-slate-400 dark:text-slate-500 mx-auto mb-3" />
              <h4 className="font-bold text-slate-900 dark:text-white">No events found</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">There are no events listed under this category at the moment. Check back soon!</p>
            </div>
          ) : (             /* Events Grid */
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
               {filteredEvents.map(event => {
                 const dateInfo = formatDate(event.date_to_held);
                 const isUpcoming = !event.event_ended;
                 const eventPic = getEventImageUrl(event.image_file);
 
                 return (
                   <div 
                     key={event.$id} 
                     className="group rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row gap-6 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden hover:-translate-y-0.5"
                   >
                     {/* Event Image Banner / Left Block */}
                     <div className="w-full md:w-44 h-48 md:h-full relative flex-shrink-0 bg-slate-100 dark:bg-slate-800">
                       {eventPic ? (
                         <img 
                           src={eventPic} 
                           alt={event.event_name || 'Event image'} 
                           className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" 
                         />
                       ) : (
                         <div className="h-full w-full bg-gradient-to-br from-[#0d6b66] to-[#0ba8a0] opacity-90 flex items-center justify-center text-white p-6">
                           <Calendar className="h-10 w-10 text-white/80" />
                         </div>
                       )}
                       
                       {/* Floating Date Block on Image */}
                       <div className="absolute top-3 left-3 flex flex-col items-center justify-center rounded-xl bg-white/90 dark:bg-slate-950/90 text-slate-800 dark:text-slate-100 font-bold p-2 text-center shadow-md min-w-[55px]">
                         <span className="text-xl font-extrabold leading-none tracking-tight block text-[#0d6b66] dark:text-teal-400">{dateInfo.day}</span>
                         <span className="text-[9px] font-extrabold uppercase tracking-widest mt-1 block">{dateInfo.month}</span>
                       </div>
                     </div>
 
                     {/* Content Block */}
                     <div className="flex-1 p-6 flex flex-col justify-between">
                       <div>
                         {/* Tags / Status Header */}
                         <div className="flex flex-wrap items-center gap-2 mb-3">
                           <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide border ${
                             isUpcoming 
                               ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30' 
                               : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-350 border-slate-150 dark:border-slate-705'
                           }`}>
                             <span className={`h-1.5 w-1.5 rounded-full ${isUpcoming ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                             {isUpcoming ? 'Upcoming / Open' : 'Completed'}
                           </span>
 
                           {/* Collaboration badges */}
                           {event.collab && event.collab.map((col: string, idx: number) => (
                             <span key={idx} className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[9px] font-bold px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 inline-flex items-center gap-1">
                               <Users className="h-2.5 w-2.5" /> {col}
                             </span>
                           ))}
                           
                           {/* Meaning/Keywords tags */}
                           {event.meaning && event.meaning.map((tag: string, idx: number) => (
                             <span key={idx} className="bg-teal-50/50 dark:bg-teal-950/10 text-[#0d6b66] dark:text-teal-400 text-[9px] font-medium px-2 py-0.5 rounded-md border border-teal-100/30">
                               #{tag}
                             </span>
                           ))}
                         </div>
 
                         {/* Title */}
                         <h4 className="text-lg font-bold text-slate-900 dark:text-white leading-snug group-hover:text-[#0d6b66] dark:group-hover:text-teal-400 transition-colors mb-2">
                           {event.event_name}
                         </h4>

                         {/* Description */}
                         <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed mb-4">
                           {event.description}
                         </p>
                         </div>

                         {/* Event Meta Footer */}
                        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-4 text-xs font-semibold text-slate-505 dark:text-slate-400">
                            <span className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5" /> {dateInfo.full !== 'Date TBD' ? '9:00 AM' : 'TBD'}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5" /> {event.location || 'Main Campus'}
                            </span>
                          </div>
 
                          <div className="flex items-center gap-3">
                            {event.related_links && event.related_links.map((link: string, idx: number) => {
                              const label = event.meaning && event.meaning[idx] ? event.meaning[idx] : 'Details';
                              return (
                                <a 
                                  key={idx} 
                                  href={link} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="inline-flex items-center gap-1 text-xs font-bold text-[#0d6b66] dark:text-teal-400 hover:underline"
                                >
                                  {label} <ExternalLink className="h-3 w-3" />
                                </a>
                              );
                            })}
 
                            {isUpcoming ? (
                              <Link 
                                to="/login" 
                                className="inline-flex items-center gap-1 text-xs font-bold text-white bg-[#0d6b66] hover:bg-[#0b5c58] px-3 py-1.5 rounded-lg shadow-sm transition-all group/btn"
                              >
                                Register <ArrowRight className="h-3 w-3 transform group-hover/btn:translate-x-1 transition-transform" />
                              </Link>
                            ) : event.rating_links ? (
                              <a 
                                href={event.rating_links} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="inline-flex items-center gap-1 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 px-3.5 py-1.5 rounded-lg shadow-sm transition-all group/btn"
                              >
                                Give Feedback <ExternalLink className="h-3 w-3" />
                              </a>
                            ) : (
                              <span className="text-xs font-bold text-slate-450 dark:text-slate-550 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md">Feedback Closed</span>
                            )}
                          </div>
                        </div>
                     </div>
                   </div>
                 );
               })}
             </div>
          )}
        </div>
      </section>

      {/* 5. STORIES & STUDENT SPOTLIGHTS */}
      <section id="stories" className="py-24 px-6 sm:px-12 md:px-20 bg-slate-50 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-905 transition-colors duration-300">
        <div className="max-w-7xl mx-auto">
          {/* Section header */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#0d6b66] dark:text-teal-400 mb-3">STUDENT SPOTLIGHT & STORIES</h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
              Celebrating Innovation and Student Milestones
            </h3>
            <div className="w-12 h-1 bg-[#0d6b66] dark:bg-teal-505 mx-auto mt-4 rounded-full"></div>
          </div>

          {/* Stories Content */}
          {loadingStories ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse text-center">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-64 rounded-2xl bg-slate-200/50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"></div>
              ))}
            </div>
          ) : stories.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-12 text-center bg-white dark:bg-slate-900 max-w-md mx-auto shadow-sm">
              <span className="text-2xl mb-2 block">🌟</span>
              <h4 className="font-bold text-slate-900 dark:text-white">No spotlight stories found</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Our members have lots of stories! We'll publish them soon.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {stories.map(story => {
                const isAward = (story.title || '').toLowerCase().includes('award') || story.meaning?.includes('achievement');
                
                return (
                  <div 
                    key={story.$id} 
                    className={`rounded-2xl border shadow-sm p-6 md:p-8 flex flex-col justify-between transition-all duration-300 hover:shadow-md hover:-translate-y-1 ${
                      isAward 
                        ? 'bg-gradient-to-br from-slate-900 to-[#0c403d] dark:from-slate-950 dark:to-[#072c2a] border-teal-900 dark:border-teal-900 text-white lg:col-span-2' 
                        : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <div>
                      {/* Badge header */}
                      <div className="flex items-center gap-2 mb-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase border ${
                          isAward 
                            ? 'bg-teal-500/10 text-teal-300 border-teal-500/20' 
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-350 border-slate-200 dark:border-slate-700'
                        }`}>
                          <Award className="h-3 w-3" /> {isAward ? 'Major Achievement' : 'Student Story'}
                        </span>
                      </div>

                      {/* Story Title */}
                      <h4 className={`text-xl font-extrabold tracking-tight mb-3 ${isAward ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                        {story.title || 'Untitled Story'}
                      </h4>

                      {/* Brief description */}
                      <p className={`text-xs font-semibold mb-4 italic ${isAward ? 'text-teal-200' : 'text-[#0d6b66] dark:text-teal-400'}`}>
                        "{story.post_description || 'No description provided.'}"
                      </p>

                      {/* Main details (truncated preview) */}
                      <p className={`text-sm leading-relaxed mb-3 ${isAward ? 'text-slate-300' : 'text-slate-600 dark:text-slate-400'}`}>
                        {story.post_details && story.post_details.length > 160
                          ? `${story.post_details.substring(0, 160)}...`
                          : story.post_details || 'No details provided.'}
                      </p>

                      <Link
                        to={`/story/${story.$id}`}
                        className={`text-xs font-bold inline-flex items-center gap-1 hover:underline mb-6 ${
                          isAward ? 'text-teal-300 hover:text-teal-200' : 'text-[#0d6b66] dark:text-teal-400 hover:text-[#0b5c58]'
                        }`}
                      >
                        Read Full Story <ChevronRight className="h-3 w-3" />
                      </Link>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-4 border-t border-white/10 dark:border-slate-800/80 mt-4">
                      <div className="flex items-center gap-2.5">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs ${
                          isAward ? 'bg-teal-500 text-slate-950' : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                        }`}>
                          {story.students?.name ? story.students.name.split(' ').map((n: string) => n[0]).join('') : 'ST'}
                        </div>
                        <div>
                          <span className={`text-xs font-bold block ${isAward ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                            {story.students?.name || 'SPECS Member'}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">Contributor</span>
                        </div>
                      </div>


                      {/* Related links */}
                      {story.related_links && story.related_links.length > 0 && (
                        <a 
                          href={story.related_links[0]} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className={`inline-flex items-center gap-1 text-xs font-bold hover:underline ${
                            isAward ? 'text-teal-400' : 'text-[#0d6b66] dark:text-teal-400'
                          }`}
                        >
                          {story.meaning && story.meaning[0] ? story.meaning[0] : 'Official Link'} <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Frequently Asked Questions (FAQ) Accordion Subsection */}
          <div className="max-w-3xl mx-auto mt-24 pt-16 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white text-center mb-8">Frequently Asked Questions</h3>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-800/80 p-6 shadow-sm divide-y divide-slate-100 dark:divide-slate-800">
              {FAQS.map(faq => (
                <div key={faq.id} className="py-4 first:pt-0 last:pb-0">
                  <button 
                    onClick={() => setFaqOpen(faqOpen === faq.id ? null : faq.id)}
                    className="w-full flex items-center justify-between text-left font-bold text-slate-800 dark:text-white py-2 focus:outline-none"
                  >
                    <span className="text-sm md:text-base">{faq.question}</span>
                    <span className="text-[#0d6b66] dark:text-teal-400 text-lg font-bold ml-4">
                      {faqOpen === faq.id ? '−' : '+'}
                    </span>
                  </button>
                  {faqOpen === faq.id && (
                    <p className="mt-2 text-xs md:text-sm text-slate-600 dark:text-slate-400 leading-relaxed pl-1 animate-slide-up">
                      {faq.answer}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 6. PARTNERSHIP SECTION */}
      <section className="py-16 px-6 sm:px-12 md:px-20 bg-white dark:bg-slate-950 transition-colors duration-300">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 border-b border-slate-100 dark:border-slate-900 pb-16">
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <h4 className="text-xs font-bold tracking-widest uppercase text-slate-400 dark:text-slate-505 mb-2">OFFICIAL CHAPTER</h4>
            <p className="text-xl font-bold text-slate-905 dark:text-white max-w-lg">
              Aligned with the College of Engineering and Computational Sciences.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center md:justify-end gap-6 md:gap-8 opacity-75 dark:opacity-60 transition-all duration-300">
            {/* PSU Logo Placeholder */}
            <div className="flex flex-col items-center text-center">
              <div className="h-10 w-10 border border-dashed border-slate-350 dark:border-slate-650 rounded-xl bg-slate-105/50 dark:bg-slate-800/30 flex items-center justify-center text-[8px] font-bold text-slate-400 dark:text-slate-500 mb-1.5 select-none" title="Partido State University Logo Placeholder">
                Logo
              </div>
              <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase">Partido State University</span>
            </div>

            <div className="hidden sm:block h-8 w-px bg-slate-200 dark:bg-slate-800"></div>

            {/* College Logo Placeholder */}
            <div className="flex flex-col items-center text-center">
              <div className="h-10 w-10 border border-dashed border-slate-350 dark:border-slate-650 rounded-xl bg-slate-105/50 dark:bg-slate-800/30 flex items-center justify-center text-[8px] font-bold text-slate-400 dark:text-slate-500 mb-1.5 select-none" title="College Logo Placeholder">
                Logo
              </div>
              <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase">College of Engineering & Comp. Sciences</span>
            </div>


          </div>
        </div>
      </section>

      {/* 7. FOOTER */}
      <footer className="bg-slate-950 text-slate-400 pt-20 pb-8 border-t border-slate-900 dark:border-slate-950">
        <div className="max-w-7xl mx-auto px-6 sm:px-12 md:px-20 grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <img src="/logo.webp" alt="SPECS Logo" className="h-9 w-9 object-contain rounded-lg" />
              <span className="text-lg font-bold text-white tracking-tight">SPECS Portal</span>
            </div>
            <p className="text-xs leading-relaxed text-slate-500">
              Official organization management portal for the Society of Programmers and Enthusiasts in Computer Science at the College of Engineering and Computational Sciences.
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h5 className="text-white text-xs font-bold tracking-wider uppercase mb-4">Organization</h5>
            <ul className="space-y-2 text-xs">
              <li><a href="#about" className="hover:text-teal-400 transition-colors">About Us</a></li>
              <li><a href="#events" className="hover:text-teal-400 transition-colors">Events Calendar</a></li>
              <li><a href="#stories" className="hover:text-teal-400 transition-colors">Student Spotlight</a></li>
              <li><Link to="/login" className="hover:text-teal-400 transition-colors">Officer Directory</Link></li>
              <li>
                <a 
                  href="https://github.com/james719-code/SPECS-Organization-Management-System" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="hover:text-teal-400 transition-colors inline-flex items-center gap-1"
                >
                  GitHub Repository <ExternalLink className="h-3 w-3" />
                </a>
              </li>
            </ul>
          </div>

          {/* Portal Navigation */}
          <div>
            <h5 className="text-white text-xs font-bold tracking-wider uppercase mb-4">Portal Action</h5>
            <ul className="space-y-2 text-xs">
              <li><Link to="/login" className="hover:text-teal-400 transition-colors">Sign In to Dashboard</Link></li>
              <li><Link to="/signup" className="hover:text-teal-400 transition-colors">Student Registration</Link></li>
              <li><Link to="/login" className="hover:text-[#0d6b66] transition-colors">Officer Access</Link></li>
            </ul>
          </div>

          {/* Contacts */}
          <div>
            <h5 className="text-white text-xs font-bold tracking-wider uppercase mb-4">Support & Contact</h5>
            <ul className="space-y-2 text-xs space-y-3">
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-teal-400 flex-shrink-0" />
                <a href="mailto:parsu.specs@gmail.com" className="text-[11px] text-slate-500 hover:text-teal-400 transition-colors truncate">
                  parsu.specs@gmail.com
                </a>
              </li>
              <li className="flex items-center gap-2">
                <svg className="h-4 w-4 text-teal-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                </svg>
                <a href="https://www.facebook.com/parsu.specs" target="_blank" rel="noopener noreferrer" className="text-[11px] text-slate-500 hover:text-teal-400 transition-colors truncate">
                  facebook.com/parsu.specs
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-teal-400 flex-shrink-0" />
                <span className="text-[11px] text-slate-500">+63 912 345 6780</span>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-teal-400 flex-shrink-0" />
                <span className="text-[11px] text-slate-500 leading-normal">Partido State University, Goa Campus, Camarines Sur, Philippines</span>
              </li>
            </ul>
          </div>
        </div>

        {/* copyright */}
        <div className="max-w-7xl mx-auto px-6 sm:px-12 md:px-20 pt-8 border-t border-slate-900 text-center text-xs text-slate-600 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>© {new Date().getFullYear()} Society of Programmers and Enthusiasts in Computer Science (SPECS). All Rights Reserved.</p>
          <div className="flex gap-4">
            <span className="hover:text-slate-400 cursor-pointer">Privacy Policy</span>
            <span>•</span>
            <span className="hover:text-slate-400 cursor-pointer">Terms of Service</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
