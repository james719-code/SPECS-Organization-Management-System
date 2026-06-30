import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { account, databases, ID } from '../shared/appwrite';
import { Mail, Lock, User, Sun, Moon, AlertCircle } from 'lucide-react';
import { DATABASE_ID, COLLECTION_ID_ACCOUNTS, COLLECTION_ID_STUDENTS } from '../shared/constants';

interface SignupPageProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const SignupPage: React.FC<SignupPageProps> = ({ theme, toggleTheme }) => {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [studentId, setStudentId] = useState('');
  const [yearLevel, setYearLevel] = useState('1');
  const [section, setSection] = useState('A');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [consent, setConsent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Client-side validations — run ALL before touching the database
      if (!name.trim()) {
        throw new Error('Full name is required.');
      }
      if (!username.trim()) {
        throw new Error('Username is required.');
      }
      if (!email.toLowerCase().endsWith('@parsu.edu.ph')) {
        throw new Error('Registration requires your official PSU email (@parsu.edu.ph)');
      }
      if (!studentId.trim()) {
        throw new Error('Student ID is required.');
      }
      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters long.');
      }
      if (password !== confirmPassword) {
        throw new Error('Passwords do not match.');
      }
      if (!consent) {
        throw new Error('Please consent to the Data Privacy terms.');
      }

      // 2. Create Auth account (only reached if all validations pass)
      const user = await account.create(ID.unique(), email, password, name);

      // 3. Initiate temp login session to authorize database writes
      await account.createEmailPasswordSession(email, password);

      // 4. Create Student profile document
      //    NOTE: username is NOT a field on StudentDoc — it lives on AccountDoc
      const studentDoc = await databases.createDocument(
        DATABASE_ID,
        COLLECTION_ID_STUDENTS,
        ID.unique(),
        {
          name: name,
          email: email,
          student_id: Number(studentId),
          yearLevel: parseInt(yearLevel, 10),
          section: section,
          address: address,
          is_volunteer: false
        }
      );

      // 5. Create Account relation document
      //    - `username` belongs here on AccountDoc
      //    - relationship field is `students` (not `student`)
      await databases.createDocument(
        DATABASE_ID,
        COLLECTION_ID_ACCOUNTS,
        user.$id,
        {
          username: username,
          type: 'student',
          students: studentDoc.$id,
          verified: false,
          deactivated: false
        }
      );

      // 6. Send verification email
      try {
        await account.createVerification(window.location.origin + '/verify');
      } catch (err) {
        console.warn('Could not trigger verification email automatically:', err);
      }

      // 7. Delete the temporary session
      await account.deleteSession('current');

      setSuccess(true);
      setLoading(false);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'An error occurred during registration.');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 transition-colors duration-300">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-xl text-center">
          <div className="h-16 w-16 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center text-3xl mx-auto mb-6 border border-emerald-100 dark:border-emerald-900/30">
            ✓
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Registration Successful</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
            Your SPECS account was created. A verification link has been sent to <span className="font-bold text-slate-900 dark:text-white">{email}</span>.
          </p>
          <div className="bg-amber-50 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/30 rounded-xl p-4 mb-6 text-left text-xs text-amber-800 dark:text-amber-400 flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div>
              <span className="font-bold">Next Step:</span> After verifying, your account needs to be cleared and approved by a class representative or SPECS officer before you can log in.
            </div>
          </div>
          <Link 
            to="/login"
            className="w-full block text-center rounded-xl bg-[#0d6b66] py-3 text-sm font-bold text-white hover:bg-[#094d4a] transition-colors shadow-md"
          >
            Go to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 py-12 px-4 transition-colors duration-300 relative overflow-hidden">
      {/* Background Blobs */}
      <div className="absolute top-1/4 left-1/4 h-[300px] w-[300px] rounded-full bg-teal-500/5 dark:bg-teal-500/10 blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 h-[250px] w-[250px] rounded-full bg-emerald-500/5 dark:bg-emerald-500/10 blur-[90px] pointer-events-none"></div>

      <div className="w-full max-w-xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 p-8 shadow-xl backdrop-blur-md relative animate-fade-in">
        <button 
          onClick={toggleTheme}
          className="absolute top-6 right-6 p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-indigo-600" />}
        </button>

        <div className="flex flex-col items-center mb-6">
          <Link to="/">
            <img src="/logo.webp" alt="SPECS Logo" className="h-10 w-10 object-contain rounded-xl shadow-md mb-3" />
          </Link>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Register Student</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Join the SPECS organization community portal</p>
        </div>

        {error && (
          <div className="mb-5 rounded-xl bg-red-50 dark:bg-red-950/20 p-4 text-xs font-semibold text-red-700 dark:text-red-400 border border-red-100 dark:border-red-900/30 text-left flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500 dark:text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4 text-left">
          {/* Section: Credentials */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Full Name</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <User className="h-4 w-4" />
                </span>
                <input 
                  type="text" 
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/40 pl-9 pr-3 py-2.5 text-xs focus:border-[#0d6b66] dark:focus:border-teal-500 focus:outline-none transition-all dark:text-white"
                  required 
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Username</label>
              <input 
                type="text" 
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="johndoe"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/40 px-3 py-2.5 text-xs focus:border-[#0d6b66] dark:focus:border-teal-500 focus:outline-none transition-all dark:text-white"
                required 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">University Email</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Mail className="h-4 w-4" />
                </span>
                <input 
                  type="email" 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="jdoe123@parsu.edu.ph"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/40 pl-9 pr-3 py-2.5 text-xs focus:border-[#0d6b66] dark:focus:border-teal-500 focus:outline-none transition-all dark:text-white"
                  required 
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Student ID Number</label>
              <input 
                type="text" 
                value={studentId}
                onChange={e => setStudentId(e.target.value)}
                placeholder="2023-12345"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/40 px-3 py-2.5 text-xs focus:border-[#0d6b66] dark:focus:border-teal-500 focus:outline-none transition-all dark:text-white"
                required 
              />
            </div>
          </div>

          {/* Section: Academic selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Year Level</label>
              <select
                value={yearLevel}
                onChange={e => setYearLevel(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 pl-3 pr-8 py-2.5 text-xs focus:border-[#0d6b66] dark:focus:border-teal-500 focus:outline-none transition-all dark:text-white"
              >
                <option value="1">1st Year</option>
                <option value="2">2nd Year</option>
                <option value="3">3rd Year</option>
                <option value="4">4th Year</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Section</label>
              <select
                value={section}
                onChange={e => setSection(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 pl-3 pr-8 py-2.5 text-xs focus:border-[#0d6b66] dark:focus:border-teal-500 focus:outline-none transition-all dark:text-white"
              >
                <option value="A">Section A</option>
                <option value="B">Section B</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Complete Address</label>
            <input 
              type="text" 
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="Barangay, Municipality, Province"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/40 px-3 py-2.5 text-xs focus:border-[#0d6b66] dark:focus:border-teal-500 focus:outline-none transition-all dark:text-white"
              required 
            />
          </div>

          {/* Section: Password */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Lock className="h-4 w-4" />
                </span>
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min 8 chars"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40 pl-9 pr-3 py-2.5 text-xs focus:border-[#0d6b66] dark:focus:border-teal-500 focus:outline-none transition-all dark:text-white"
                  required 
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Confirm Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Lock className="h-4 w-4" />
                </span>
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40 pl-9 pr-3 py-2.5 text-xs focus:border-[#0d6b66] dark:focus:border-teal-500 focus:outline-none transition-all dark:text-white"
                  required 
                />
              </div>
            </div>
          </div>
          
          <div className="flex justify-end pr-2 text-[10px] text-slate-400">
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="hover:underline">
              {showPassword ? "Hide password characters" : "Show password characters"}
            </button>
          </div>

          {/* Privacy Consent */}
          <div className="flex items-start gap-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 p-4 mt-2">
            <input 
              type="checkbox" 
              id="privacy" 
              checked={consent}
              onChange={e => setConsent(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-350 dark:border-slate-700 text-[#0d6b66] focus:ring-[#0d6b66]"
              required 
            />
            <label htmlFor="privacy" className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed cursor-pointer select-none">
              I consent to the collection and processing of my student data by the Society of Programmers and Enthusiasts in Computer Science (SPECS) for membership administration purposes under the Philippines Data Privacy Act of 2012.
            </label>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full rounded-xl bg-[#0d6b66] hover:bg-[#094d4a] py-3.5 text-sm font-bold text-white shadow-lg shadow-teal-900/10 hover:shadow-teal-900/20 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:pointer-events-none mt-4"
          >
            {loading ? 'Creating Account...' : 'Register as Member'}
          </button>
        </form>

        <div className="mt-6 border-t border-slate-100 dark:border-slate-800 pt-4 text-center text-xs">
          <span className="text-slate-500 dark:text-slate-400">Already registered? </span>
          <Link to="/login" className="font-bold text-[#0d6b66] dark:text-teal-400 hover:underline">
            Sign In Here
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
