import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  Eye,
  Heart,
  Menu,
  Sparkles,
  X,
} from "lucide-react";
import {
  AlphabetDoodle,
  BlocksDoodle,
  GardenDoodle,
  HouseDoodle,
  LeafDoodle,
  LeafMark,
  NumbersDoodle,
  PaintDoodle,
  ShapesDoodle,
  StoryBookDoodle,
  SunDoodle,
} from "@/components/illustrations";
import "@/styles/landing.css";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "VikasSetu – An Observation-Led Companion for Early Learning" },
      {
        name: "description",
        content:
          "Small steps build big dreams. Give every early learner the attention, activities, and encouragement they need to grow.",
      },
      { property: "og:title", content: "VikasSetu – An Observation-Led Companion for Early Learning" },
      {
        property: "og:description",
        content:
          "Small steps build big dreams. Give every early learner the attention, activities, and encouragement they need to grow.",
      },
    ],
  }),
  component: LandingPage,
});

const benefits = [
  {
    number: "01",
    icon: Eye,
    title: "Understand every child",
    copy: "Keep child profiles and recorded observations together, so the small details that matter stay close at hand.",
    accent: "coral",
  },
  {
    number: "02",
    icon: CalendarDays,
    title: "Keep the classroom organised",
    copy: "Bring classroom information and attendance into one calm, practical place for the day-to-day work.",
    accent: "sage",
  },
  {
    number: "03",
    icon: Sparkles,
    title: "Find meaningful activities",
    copy: "When relevant child information is available, activity suggestions can help you choose a thoughtful next step.",
    accent: "yellow",
  },
  {
    number: "04",
    icon: Heart,
    title: "Notice progress over time",
    copy: "Use observations and activity-trial notes to reflect on what a child is exploring and where to go next.",
    accent: "teal",
  },
];

const domains = [
  {
    title: "Alphabet & Language",
    copy: "Build a love of words through sounds, letters, conversations, and early mark-making.",
    illustration: AlphabetDoodle,
    tone: "domain-coral",
  },
  {
    title: "Numbers & Counting",
    copy: "Make quantity visible with counting, matching, comparing, and everyday number talk.",
    illustration: NumbersDoodle,
    tone: "domain-yellow",
  },
  {
    title: "Colours & Shapes",
    copy: "Notice patterns, colours, lines, and shapes as children make sense of the world around them.",
    illustration: ShapesDoodle,
    tone: "domain-sage",
  },
  {
    title: "Art & Creativity",
    copy: "Leave room for experimenting with materials, movement, mark-making, and imagination.",
    illustration: PaintDoodle,
    tone: "domain-teal",
  },
  {
    title: "Stories, Habits & Games",
    copy: "Grow language, routines, social learning, and joy through stories, songs, and shared play.",
    illustration: StoryBookDoodle,
    tone: "domain-paper",
  },
];

const playIdeas = [
  {
    title: "Count & Match",
    domain: "Numbers & Counting",
    copy: "A simple invitation to compare groups and talk through what children notice.",
    illustration: BlocksDoodle,
    tone: "activity-coral",
  },
  {
    title: "Alphabet Match",
    domain: "Alphabet & Language",
    copy: "Pair familiar letters with pictures, sounds, and the words children already know.",
    illustration: AlphabetDoodle,
    tone: "activity-yellow",
  },
  {
    title: "Leaf Printing",
    domain: "Art & Creativity",
    copy: "Turn a walk outside into an open-ended way to notice texture, shape, and colour.",
    illustration: LeafDoodle,
    tone: "activity-sage",
  },
  {
    title: "Story Circle",
    domain: "Stories, Habits & Games",
    copy: "Make space for retelling, listening, movement, and children’s own questions.",
    illustration: StoryBookDoodle,
    tone: "activity-teal",
  },
];

const gallery = [
  { title: "A garden to share", illustration: HouseDoodle, className: "artwork-one" },
  { title: "Shapes in the sunshine", illustration: SunDoodle, className: "artwork-two" },
  { title: "A growing little world", illustration: GardenDoodle, className: "artwork-three" },
  { title: "Counting colours", illustration: BlocksDoodle, className: "artwork-four" },
];

function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="landing-page">
      <header className="site-header">
        <div className="site-container nav-shell">
          <Link to="/" className="brand" onClick={closeMenu} aria-label="VikasSetu – Aamchi Shala home">
            <span className="brand-mark"><LeafMark /></span>
            <span className="brand-copy">
              <strong>VikasSetu</strong>
              <span>Aamchi Shala</span>
            </span>
          </Link>
          <button
            className="menu-toggle"
            type="button"
            aria-expanded={menuOpen}
            aria-controls="primary-navigation"
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={22} strokeWidth={1.8} /> : <Menu size={22} strokeWidth={1.8} />}
          </button>
          <nav id="primary-navigation" className={`primary-nav ${menuOpen ? "is-open" : ""}`} aria-label="Primary navigation">
            <a href="#moments" onClick={closeMenu}>Why VikasSetu</a>
            <a href="#domains" onClick={closeMenu}>Learning paths</a>
            <a href="#activities" onClick={closeMenu}>Activities</a>
            <a href="#how-it-works" onClick={closeMenu}>How it works</a>
            <Link to="/dashboard" className="nav-login" onClick={closeMenu}>Teacher Portal</Link>
            <Link to="/dashboard" className="button button-small button-outline-forest" onClick={closeMenu}>
              Enter App <ArrowRight size={15} />
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="hero-section" aria-labelledby="hero-title">
          <div className="site-container hero-grid">
            <div className="hero-copy rise-in">
              <p className="eyebrow"><span className="eyebrow-dot" /> An observation-led companion for early learning</p>
              <h1 id="hero-title">Small steps<br className="hero-br" />build <em>big dreams.</em></h1>
              <p className="hero-lede">Every child learns differently. Give every learner the attention, activities, and encouragement they need to grow.</p>
              <div className="hero-actions">
                <Link to="/dashboard" className="button button-primary">
                  Launch VikasSetu <ArrowRight size={17} />
                </Link>
                <a className="button button-quiet" href="#activities">Explore activities <ChevronRight size={17} /></a>
              </div>
              <div className="trust-note"><span className="trust-check"><Check size={13} /></span> Made for preschool and Anganwadi teachers.</div>
            </div>
            <div className="hero-art rise-in" aria-label="A teacher speaking to a classroom of attentive young children">
              <div className="hero-art-frame">
                <picture>
                  <source srcSet="/classroom-hero-sketch.webp" type="image/webp" />
                  <img
                    src="/classroom-hero-sketch.png"
                    alt="A teacher speaking to a classroom of attentive young children"
                    width={1086}
                    height={712}
                    loading="eager"
                  />
                </picture>
              </div>
            </div>
          </div>
          <div className="hero-rule site-container">
            <span>For the noticing, the trying, and the tiny breakthroughs</span>
            <span className="rule-line" />
            <span className="rule-leaf"><LeafDoodle /></span>
          </div>
        </section>

        <section className="moments-section section-pad" id="moments" aria-labelledby="moments-title">
          <div className="site-container">
            <div className="section-intro split-intro">
              <div>
                <p className="section-kicker">A little more room to notice</p>
                <h2 id="moments-title">Made for the moments <em>that matter.</em></h2>
              </div>
              <p>Every day brings new opportunities to notice, encourage, and support a child’s learning. VikasSetu keeps the useful context close, while you stay in the lead.</p>
            </div>
            <div className="benefit-grid">
              {benefits.map(({ number, icon: Icon, title, copy, accent }) => (
                <article className={`benefit-item accent-${accent}`} key={title}>
                  <div className="benefit-topline"><span>{number}</span><Icon size={20} strokeWidth={1.7} /></div>
                  <h3>{title}</h3>
                  <p>{copy}</p>
                  <span className="benefit-underline" />
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="domains-section section-pad" id="domains" aria-labelledby="domains-title">
          <div className="site-container">
            <div className="section-intro centered-intro">
              <p className="section-kicker">A wider view of learning</p>
              <h2 id="domains-title">Many ways to learn. <em>Every child’s own journey.</em></h2>
              <p>Learning is not one straight line. These five familiar paths make it easier to notice what is inviting a child in today.</p>
            </div>
            <div className="domain-grid">
              {domains.map(({ title, copy, illustration: Illustration, tone }) => (
                <Link to="/activities" key={title} className={`domain-card ${tone}`}>
                  <div>
                    <div className="domain-art"><Illustration /></div>
                    <h3>{title}</h3>
                    <p>{copy}</p>
                  </div>
                  <span className="card-arrow"><ArrowRight size={14} /></span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="activities-section section-pad" id="activities" aria-labelledby="activities-title">
          <div className="site-container">
            <div className="section-intro split-intro activity-heading">
              <div>
                <p className="section-kicker">Playful ideas ready to go</p>
                <h2 id="activities-title">Low-prep activities for <em>busy days.</em></h2>
              </div>
              <div>
                <p>Simple materials, low setup, and plenty of room for conversation. Use them as whole-group invitations or small-group moments.</p>
                <Link to="/activities" className="text-link">Browse full activity hub <ArrowRight size={14} /></Link>
              </div>
            </div>
            <div className="activity-grid">
              {playIdeas.map(({ title, domain, copy, illustration: Illustration, tone }) => (
                <Link to="/activities" key={title} className={`activity-card ${tone}`}>
                  <div className="activity-visual"><Illustration /></div>
                  <div className="activity-content">
                    <p className="activity-domain">{domain}</p>
                    <h3>{title}</h3>
                    <p>{copy}</p>
                    <span className="activity-link-note">Open activity <ArrowRight size={12} /></span>
                  </div>
                </Link>
              ))}
            </div>
            <p className="data-note">
              <span className="data-note-mark">i</span>
              <span>All activity plans align with the 5 Early Childhood Development learning domains: Alphabet, Numbers, Colours & Shapes, Art, and Stories.</span>
            </p>
          </div>
        </section>

        <section className="gallery-section section-pad" aria-labelledby="gallery-title">
          <div className="site-container gallery-layout">
            <div className="gallery-copy">
              <p className="section-kicker">Every mark tells a story</p>
              <h2 id="gallery-title">A gallery of <em>little attempts.</em></h2>
              <p>When learning is visible, children feel seen and teachers can celebrate the gradual shifts that standardized metrics often miss.</p>
              <div className="gallery-caption"><span className="caption-line" /> Handcrafted classroom observations</div>
            </div>
            <div className="artwork-grid">
              {gallery.map(({ title, illustration: Illustration, className }) => (
                <figure className={`artwork-sheet ${className}`} key={title}>
                  <span className="sheet-tape" />
                  <Illustration />
                  <figcaption>{title}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        <section className="how-section section-pad" id="how-it-works" aria-labelledby="how-title">
          <div className="site-container">
            <div className="section-intro centered-intro how-intro">
              <p className="section-kicker">Simple by design</p>
              <h2 id="how-title">Three calm steps <em>each day.</em></h2>
              <p>Designed around the rhythm of a preschool morning, without extra screens or administrative weight.</p>
            </div>
            <div className="steps-track">
              <span className="track-line" />
              <div className="step-card">
                <span className="step-number">1</span>
                <div className="step-illustration"><Eye size={42} strokeWidth={1.5} className="text-[#193e35]" /></div>
                <h3>Observe</h3>
                <p>Take one tap attendance and jot down real moments as children play and explore.</p>
              </div>
              <div className="step-card">
                <span className="step-number">2</span>
                <div className="step-illustration"><Heart size={42} strokeWidth={1.5} className="text-[#d9826b]" /></div>
                <h3>Understand</h3>
                <p>See who is flourishing and who could use gentle support in specific learning domains.</p>
              </div>
              <div className="step-card">
                <span className="step-number">3</span>
                <div className="step-illustration"><Sparkles size={42} strokeWidth={1.5} className="text-[#3e8178]" /></div>
                <h3>Encourage</h3>
                <p>Pick guided activities backed by pedagogical recommendations tailored for each child.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="cta-section">
          <div className="site-container">
            <div className="cta-panel">
              <div className="cta-illustration"><GardenDoodle /></div>
              <div className="cta-copy">
                <p className="section-kicker" style={{ color: "#efc96e" }}>Welcome to VikasSetu</p>
                <h2>Small steps today. <em>Big dreams tomorrow.</em></h2>
                <p>Join preschool and Anganwadi teachers using VikasSetu – Aamchi Shala to nurture every child’s potential.</p>
                <div className="cta-actions">
                  <Link to="/dashboard" className="button button-primary">
                    Open Teacher Dashboard <ArrowRight size={16} />
                  </Link>
                  <Link to="/recommendations" className="button button-quiet">
                    View AI Recommendations <ChevronRight size={16} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="site-container">
          <div className="footer-grid">
            <div>
              <div className="brand brand-footer">
                <span className="brand-mark"><LeafMark /></span>
                <span className="brand-copy">
                  <strong>VikasSetu</strong>
                  <span>Aamchi Shala</span>
                </span>
              </div>
              <p className="footer-copy">
                A warm, observation-led preschool companion helping teachers notice the small milestones that build lifelong confidence.
              </p>
            </div>
            <div>
              <p className="footer-heading">Teacher Tools</p>
              <div className="footer-links">
                <Link to="/dashboard">Dashboard</Link>
                <Link to="/children">Children Profiles</Link>
                <Link to="/attendance">Attendance</Link>
                <Link to="/progress">Observation Management</Link>
                <Link to="/recommendations">Recommendations</Link>
              </div>
            </div>
            <div>
              <p className="footer-heading">Learning Areas</p>
              <div className="footer-links">
                <Link to="/activities">Alphabet & Language</Link>
                <Link to="/activities">Numbers & Counting</Link>
                <Link to="/activities">Colours & Shapes</Link>
                <Link to="/activities">Art & Creativity</Link>
                <Link to="/activities">Stories & Games</Link>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <span>VikasSetu — Aamchi Shala</span>
            <span>Built with care for teachers and young learners</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
