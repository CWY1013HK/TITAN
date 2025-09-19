import React from 'react';
import { Link } from 'react-router-dom';

const PromotionalHome = () => {
  return (
    <div className="min-h-screen bg-[#0a1020]">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0a1020] via-[#0c1530] to-[#0e1a3f]">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-16 -left-16 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-16 -right-16 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 relative">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg mb-6">
              <span className="text-white text-xl font-bold">TR</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight">
              TRACES
            </h1>
            <p className="text-lg md:text-2xl text-blue-100 mt-2">Transdisciplinary Academic Conference for Emerging Scholars</p>
            <p className="text-base md:text-lg text-blue-200/80 mt-4">Unlocking the Intersection of Science and Humanities</p>
            <div className="mt-8 md:mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <span className="inline-flex items-center rounded-full bg-white/10 text-blue-100 px-4 py-2 text-sm md:text-base ring-1 ring-white/10">28 June 2025</span>
              <span className="hidden sm:inline text-blue-300/40">•</span>
              <span className="inline-flex items-center rounded-full bg-white/10 text-blue-100 px-4 py-2 text-sm md:text-base ring-1 ring-white/10">CPD4.36, The University of Hong Kong</span>
            </div>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/register" className="px-6 py-3 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow hover:shadow-md transition">
                Register
              </Link>
              <Link to="/workshops" className="px-6 py-3 rounded-full border border-white/20 text-blue-100 font-semibold hover:border-blue-400 hover:text-white transition">
                View Workshops
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* News Section */}
      <section className="py-16 md:py-20 bg-[#0b142c]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-white">News</h2>
            <Link to="/news" className="text-blue-300 hover:text-blue-200 font-medium">See all</Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <article className="group p-6 rounded-2xl bg-white/5 ring-1 ring-white/10 hover:ring-blue-500/30 transition">
              <p className="text-xs uppercase tracking-wide text-blue-300 font-semibold">Conference</p>
              <h3 className="mt-2 text-lg font-semibold text-white group-hover:text-blue-200">
                TRACES 2025: Hong Kong’s Student-Led Academic Conference Celebrates a Landmark Year of Transdisciplinary Innovation
              </h3>
              <p className="mt-2 text-sm text-blue-200/80">Jun 28</p>
              <Link to="/news/traces-2025" className="mt-4 inline-block text-blue-300 hover:text-blue-200 font-medium">Read more →</Link>
            </article>
            <article className="group p-6 rounded-2xl bg-white/5 ring-1 ring-white/10 hover:ring-blue-500/30 transition">
              <p className="text-xs uppercase tracking-wide text-emerald-300 font-semibold">Workshops</p>
              <h3 className="mt-2 text-lg font-semibold text-white group-hover:text-blue-200">
                TRACES and HKU UAS Team Launch "Future Flyers: A Hands-On SUA Adventure"
              </h3>
              <p className="mt-2 text-sm text-blue-200/80">Jun 21</p>
              <Link to="/news/future-flyers" className="mt-4 inline-block text-blue-300 hover:text-blue-200 font-medium">Read more →</Link>
            </article>
            <article className="group p-6 rounded-2xl bg-white/5 ring-1 ring-white/10 hover:ring-blue-500/30 transition">
              <p className="text-xs uppercase tracking-wide text-indigo-300 font-semibold">International Outreach</p>
              <h3 className="mt-2 text-lg font-semibold text-white group-hover:text-blue-200">
                Another Successful Information Session at Massey University, New Zealand
              </h3>
              <p className="mt-2 text-sm text-blue-200/80">May 5</p>
              <Link to="/news/massey-session" className="mt-4 inline-block text-blue-300 hover:text-blue-200 font-medium">Read more →</Link>
            </article>
          </div>
        </div>
      </section>

      {/* Workshops Section */}
      <section className="py-16 md:py-20 bg-[#0a1327]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-white">Workshops</h2>
            <Link to="/workshops" className="text-blue-300 hover:text-blue-200 font-medium">See all</Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-white/5 ring-1 ring-white/10">
              <p className="text-sm text-blue-200/80">Sat, 20 Sept</p>
              <h3 className="mt-1 text-lg font-semibold text-white">Future Flyers: An Orientation Day of SUA Exploration</h3>
              <p className="mt-2 text-sm text-blue-200/80">HKU RRST-4.36 & Lung Fu Shan, Pok Fu Lam, Hong Kong</p>
              <div className="mt-4">
                <Link to="/workshops/orientation-day" className="text-blue-300 hover:text-blue-200 font-medium">Register →</Link>
              </div>
            </div>
            <div className="p-6 rounded-2xl bg-white/5 ring-1 ring-white/10">
              <p className="text-sm text-blue-200/80">Sat, 21 Jun</p>
              <h3 className="mt-1 text-lg font-semibold text-white">Future Flyers: A Hands-On SUA Adventure</h3>
              <p className="mt-2 text-sm text-blue-200/80">Innovation Wing One, HKU, Pok Fu Lam, Hong Kong</p>
              <p className="mt-1 text-sm text-emerald-300">Low-altitude Economy in action. Learn, Fly, and Master Drones!</p>
              <div className="mt-4">
                <Link to="/workshops/hands-on-sua" className="text-blue-300 hover:text-blue-200 font-medium">Details →</Link>
              </div>
            </div>
            <div className="p-6 rounded-2xl bg-white/5 ring-1 ring-white/10">
              <p className="text-sm text-blue-200/80">Sat, 22 Mar</p>
              <h3 className="mt-1 text-lg font-semibold text-white">AI Literacy Series: Rise of Neural Network and Deep Learning</h3>
              <p className="mt-2 text-sm text-blue-200/80">St. Paul's College, 69 Bonham Rd, Mid-Levels, Hong Kong</p>
              <div className="mt-4">
                <Link to="/workshops/ai-literacy" className="text-blue-300 hover:text-blue-200 font-medium">Details →</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Keynote Speaker */}
      <section className="py-16 md:py-20 bg-[#0b142c]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-8">Keynote Speaker</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
            <div className="md:col-span-1">
              <div className="w-full aspect-square rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-700 flex items-center justify-center text-4xl text-white font-bold">JC</div>
            </div>
            <div className="md:col-span-2">
              <h3 className="text-xl md:text-2xl font-semibold text-white">Professor Javier Cha</h3>
              <p className="text-blue-200/80">Assistant Professor, The University of Hong Kong</p>
              <p className="mt-4 text-blue-100/90 leading-relaxed">
                As the keynote speaker for TRACES, Professor Cha exemplifies the conference’s commitment to blending humanities, technology, and sustainability. His work aligns with the theme of fostering innovative, transdisciplinary research, inspiring students to explore the future of academic inquiry in a digitally transformed world.
              </p>
              <div className="mt-4">
                <Link to="/keynote/javier-cha" className="text-blue-300 hover:text-blue-200 font-medium">Details →</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-16 md:py-20 bg-[#0a1327]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-8">Timeline</h2>
          <div className="bg-white/5 ring-1 ring-white/10 rounded-2xl p-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              <div className="md:col-span-1">
                <div className="rounded-lg bg-white/10 px-3 py-2 inline-block text-blue-100 font-semibold">2025</div>
              </div>
              <div className="space-y-4 md:col-span-4">
                <div className="flex items-start gap-4">
                  <div className="w-2 h-2 mt-2 rounded-full bg-blue-400" />
                  <div>
                    <p className="text-sm text-blue-200/80">May</p>
                    <p className="font-medium text-white">Abstract Submission Deadline</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-2 h-2 mt-2 rounded-full bg-blue-400" />
                  <div>
                    <p className="text-sm text-blue-200/80">Jun</p>
                    <p className="font-medium text-white">Publication of the Book of Abstracts</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-2 h-2 mt-2 rounded-full bg-blue-400" />
                  <div>
                    <p className="text-sm text-blue-200/80">Jun</p>
                    <p className="font-medium text-white">Conference & Presentation</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-2 h-2 mt-2 rounded-full bg-blue-400" />
                  <div>
                    <p className="text-sm text-blue-200/80">Aug</p>
                    <p className="font-medium text-white">Full Manuscript Submission Deadline</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-2 h-2 mt-2 rounded-full bg-blue-400" />
                  <div>
                    <p className="text-sm text-blue-200/80">Oct</p>
                    <p className="font-medium text-white">Publication of the Conference Proceedings</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Venue */}
      <section className="py-16 md:py-20 bg-[#0b142c]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">The Venue</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="rounded-2xl bg-gradient-to-tr from-blue-900 to-indigo-900/70 aspect-video w-full ring-1 ring-white/10" />
            <div>
              <h3 className="text-xl font-semibold text-white">The University of Hong Kong</h3>
              <p className="text-blue-200/80">Pokfulam, Hong Kong</p>
              <p className="mt-4 text-blue-100/90 leading-relaxed">
                The University of Hong Kong, Asia’s Global University, delivers impact through internationalisation, innovation and interdisciplinarity. It attracts and nurtures global scholars through excellence in research, teaching and learning, and knowledge exchange.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Outreach Banner */}
      <section className="py-14 bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <h2 className="text-2xl md:text-3xl font-bold text-white">Student Outreach</h2>
            <p className="text-blue-100">Driving research forward</p>
          </div>
        </div>
      </section>

      {/* Event CTA */}
      <section className="py-16 md:py-20 bg-[#0a1327]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-8 md:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <p className="text-sm uppercase tracking-wide text-blue-300 font-semibold">TRACES 2025</p>
              <h3 className="mt-1 text-2xl md:text-3xl font-bold text-white">Conference & Presentation</h3>
              <p className="mt-2 text-blue-100/90">28 Jun 2025 • CPD4.36, The University of Hong Kong • Pok Fu Lam, Hong Kong</p>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/register" className="px-6 py-3 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow hover:shadow-md transition">Register</Link>
              <a href="mailto:traceshk@gmail.com" className="px-6 py-3 rounded-full border border-white/20 text-blue-100 font-semibold hover:border-blue-400 hover:text-white transition">Contact Us</a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PromotionalHome; 