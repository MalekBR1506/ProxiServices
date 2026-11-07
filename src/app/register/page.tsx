'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  User, 
  Briefcase, 
  Mail, 
  Lock, 
  Phone, 
  MapPin, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Wrench, 
  Image as ImageIcon,
  DollarSign,
  Clock
} from 'lucide-react';
import { getCurrentSession, saveSession } from '@/lib/auth-client';
import { Category, PriceType } from '@/types';
import { DEFAULT_COORDINATES } from '@/lib/geo';
import LocationPicker from '@/components/LocationPicker';



export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<'CLIENT' | 'PROVIDER'>('CLIENT');

  // Common fields
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [addressText, setAddressText] = useState<string>('Tunis, Tunisia');
  const [latitude, setLatitude] = useState(DEFAULT_COORDINATES.latitude);
  const [longitude, setLongitude] = useState(DEFAULT_COORDINATES.longitude);
  const [categories, setCategories] = useState<Category[]>([]);

  // Provider specific fields
  const [categorySlug, setCategorySlug] = useState<string>('mechanic');
  const [bio, setBio] = useState<string>('');
  const [experienceYears, setExperienceYears] = useState<number>(5);
  const [operationalRadiusKm, setOperationalRadiusKm] = useState<number>(20);

  // Dynamic services list
  const [services, setServices] = useState<
    { title: string; description: string; price: number; priceType: PriceType; durationMinutes: number }[]
  >([
    {
      title: 'Main service',
      description: 'Careful work with professional tools and a workmanship guarantee.',
      price: 35,
      priceType: 'FIXED',
      durationMinutes: 60,
    },
  ]);

  // Dynamic portfolio items
  const [portfolio, setPortfolio] = useState<
    { title: string; description: string }[]
  >([
    {
      title: 'Example of recent work',
      description: 'Successfully completed work for a residential customer.',
    },
  ]);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const requestedRole = new URLSearchParams(window.location.search).get('role');
    if (requestedRole === 'provider') setRole('PROVIDER');
    if (requestedRole === 'client') setRole('CLIENT');
    getCurrentSession().then((session) => {
      const setup = new URLSearchParams(window.location.search).get('setup') === '1';
      if (session && !setup) router.replace(session.user.role === 'PROVIDER' ? '/provider/dashboard' : '/client/dashboard');
    });
  }, [router]);

  useEffect(() => {
    fetch('/api/categories').then((response) => response.json()).then((result) => {
      if (result.success) setCategories(result.data);
    }).catch(() => setError('Could not load service categories.'));
  }, []);

  // Service helpers
  const handleAddService = () => {
    setServices([
      ...services,
      {
        title: '',
        description: '',
        price: 25,
        priceType: 'FIXED',
        durationMinutes: 60,
      },
    ]);
  };

  const handleRemoveService = (index: number) => {
    setServices(services.filter((_, i) => i !== index));
  };

  const handleUpdateService = (index: number, field: string, val: any) => {
    const updated = [...services];
    updated[index] = { ...updated[index], [field]: val };
    setServices(updated);
  };

  // Portfolio helpers
  const handleAddPortfolio = () => {
    setPortfolio([
      ...portfolio,
      {
        title: '',
        description: '',
      },
    ]);
  };

  const handleRemovePortfolio = (index: number) => {
    setPortfolio(portfolio.filter((_, i) => i !== index));
  };

  const handleUpdatePortfolio = (index: number, field: string, val: string) => {
    const updated = [...portfolio];
    updated[index] = { ...updated[index], [field]: val };
    setPortfolio(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload: any = {
        name,
        email,
        phone,
        password,
        role,
        addressLabel: addressText,
        lat: latitude,
        lng: longitude,
      };

      if (role === 'PROVIDER') {
        payload.categorySlug = categorySlug;
        payload.bio = bio || `Professional provider specializing in ${categorySlug}.`;
        payload.experienceYears = Number(experienceYears);
        payload.operationalRadiusKm = Number(operationalRadiusKm);
        payload.services = services.filter((s) => s.title.trim().length > 0);
        payload.portfolio = portfolio.filter((p) => p.title.trim().length > 0);
      }

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Registration failed');
      }

      saveSession();

      if (role === 'PROVIDER') {
        router.push('/provider/dashboard');
      } else {
        router.push('/client/request/new');
      }
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-sand px-4 py-12 paper-grain sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="font-display text-4xl font-black tracking-tight text-ink">
            Create a ProxiService account
          </h1>
          <p className="text-sm text-ink/60">
            Join our community as a customer or service professional
          </p>
        </div>

        {/* Role Toggle Selector */}
        <div className="mx-auto grid max-w-lg grid-cols-2 gap-3 border-2 border-ink bg-paper p-1.5 shadow-hard-sm">
          <button
            type="button"
            onClick={() => setRole('PROVIDER')}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition ${
              role === 'PROVIDER'
                ? 'bg-teal text-white shadow-hard-sm'
                : 'text-ink/60 hover:bg-mustard hover:text-ink'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>I provide services</span>
          </button>

          <button
            type="button"
            onClick={() => setRole('CLIENT')}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition ${
              role === 'CLIENT'
                ? 'bg-teal text-white shadow-hard-sm'
                : 'text-ink/60 hover:bg-mustard hover:text-ink'
            }`}
          >
            <User className="w-4 h-4" />
            <span>I am looking for a service (Client)</span>
          </button>
        </div>

        {/* Main Card */}
        <div className="space-y-6 border-2 border-ink bg-paper p-6 shadow-hard sm:p-10">
          {error && (
            <div className="flex items-center gap-2 border-2 border-tomato bg-tomato/10 p-3.5 text-xs text-tomato">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Section 1: Basic details */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2">
                1. Your Details & Login
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Full name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Karim Benali"
                    className="w-full border-2 border-ink bg-sand px-3.5 py-2.5 text-xs outline-none focus:bg-paper sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phone number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+216 550..."
                    className="w-full border-2 border-ink bg-sand px-3.5 py-2.5 text-xs outline-none focus:bg-paper sm:text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email address *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nom@exemple.com"
                    className="w-full border-2 border-ink bg-sand px-3.5 py-2.5 text-xs outline-none focus:bg-paper sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full border-2 border-ink bg-sand px-3.5 py-2.5 text-xs outline-none focus:bg-paper sm:text-sm"
                  />
                </div>
              </div>

              <LocationPicker
                label="Home address / city"
                value={{ lat: latitude, lng: longitude, addressLabel: addressText }}
                onChange={(next) => { setLatitude(next.lat); setLongitude(next.lng); setAddressText(next.addressLabel); }}
              />
            </div>

            {/* Provider Section */}
            {role === 'PROVIDER' && (
              <>
                {/* Section 2: Service and coverage area */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2">
                    2. Service & Coverage Area
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Your main service *
                      </label>
                      <select
                        value={categorySlug}
                        onChange={(e) => setCategorySlug(e.target.value)}
                        className="w-full border-2 border-ink bg-sand px-3.5 py-2.5 text-xs font-bold outline-none focus:bg-paper sm:text-sm"
                      >
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.slug}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Years d'experience *
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={experienceYears}
                        onChange={(e) => setExperienceYears(Number(e.target.value))}
                        className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-xs font-semibold text-slate-700 mb-1">
                      <span>Radius d'intervention maximal :</span>
                      <span className="font-black text-teal">{operationalRadiusKm} km around your base</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="60"
                      step="5"
                      value={operationalRadiusKm}
                      onChange={(e) => setOperationalRadiusKm(Number(e.target.value))}
                      className="w-full cursor-pointer accent-teal"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Customers in this area can find your profile in search results.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      About your work
                    </label>
                    <textarea
                      rows={3}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Describe your skills, equipment, and guarantees..."
                      className="w-full resize-none border-2 border-ink bg-sand px-3.5 py-2.5 text-xs outline-none focus:bg-paper sm:text-sm"
                    />
                  </div>
                </div>

                {/* Section 3: Catalogue des Prestations & Tarifs */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                      3. Vos Prestations & Tarifs (Fixes ou Horaires)
                    </h3>
                    <button
                      type="button"
                      onClick={handleAddService}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add a service</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {services.map((srv, idx) => (
                      <div
                        key={idx}
                        className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 relative"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-700">Service #{idx + 1}</span>
                          {services.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveService(idx)}
                              className="text-rose-500 hover:text-rose-700 p-1"
                              title="Delete this service"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="sm:col-span-2">
                            <input
                              type="text"
                              required
                              placeholder="Service name (e.g. oil change, window cleaning)"
                              value={srv.title}
                              onChange={(e) => handleUpdateService(idx, 'title', e.target.value)}
                              className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none"
                            />
                          </div>
                          <div>
                            <select
                              value={srv.priceType}
                              onChange={(e) => handleUpdateService(idx, 'priceType', e.target.value)}
                              className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none"
                            >
                              <option value="FIXED">Fixed price</option>
                              <option value="HOURLY">Hourly rate</option>
                              <option value="ESTIMATE">Quote required</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] text-slate-500 mb-0.5">Price (TND)</label>
                            <input
                              type="number"
                              required
                              value={srv.price}
                              onChange={(e) => handleUpdateService(idx, 'price', Number(e.target.value))}
                              className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none font-bold text-blue-600"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] text-slate-500 mb-0.5">Estimated duration (minutes)</label>
                            <input
                              type="number"
                              value={srv.durationMinutes}
                              onChange={(e) => handleUpdateService(idx, 'durationMinutes', Number(e.target.value))}
                              className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <input
                            type="text"
                            placeholder="Briefly describe what is included..."
                            value={srv.description}
                            onChange={(e) => handleUpdateService(idx, 'description', e.target.value)}
                            className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Section 4: Past projects / portfolio */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                      4. Anciens Travaux & Portfolio (Photos)
                    </h3>
                    <button
                      type="button"
                      onClick={handleAddPortfolio}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add a project</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {portfolio.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row gap-4 items-start"
                      >
                        <div className="w-20 h-20 rounded-xl bg-blue-100 text-blue-700 grid place-items-center shrink-0 border border-slate-300 font-bold">
                          Work
                        </div>

                        <div className="flex-1 w-full space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-700">Project #{idx + 1}</span>
                            {portfolio.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemovePortfolio(idx)}
                                className="text-rose-500 hover:text-rose-700 p-0.5"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          <input
                            type="text"
                            placeholder="Project title (e.g. bathroom renovation, car service)"
                            value={item.title}
                            onChange={(e) => handleUpdatePortfolio(idx, 'title', e.target.value)}
                            className="w-full text-xs px-3 py-1.5 bg-white border border-slate-300 rounded-xl outline-none"
                          />

                          <input
                            type="text"
                            placeholder="Short project description"
                            value={item.description}
                            onChange={(e) => handleUpdatePortfolio(idx, 'description', e.target.value)}
                            className="w-full text-xs px-3 py-1.5 bg-white border border-slate-300 rounded-xl outline-none"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Submit Button */}
            <div className="pt-6 border-t border-slate-100">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold rounded-2xl shadow-xl shadow-blue-500/25 text-sm transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>
                  {loading
                    ? 'Creating account...'
                    : role === 'PROVIDER'
                    ? 'Publish provider profile and create account'
                    : 'Create customer account'}
                </span>
              </button>
            </div>
          </form>

          <div className="text-center pt-2">
            <p className="text-xs text-slate-500">
              Already have an account?{' '}
              <Link href="/login" className="font-bold text-blue-600 hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
