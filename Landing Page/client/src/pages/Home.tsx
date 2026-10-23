import { useState } from "react";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  CircleCheck,
  Eye,
  Heart,
  Menu,
  Sparkles,
  UsersRound,
  X,
} from "lucide-react";
import { startLogin } from "@/const";
import {
  AlphabetDoodle,
  BlocksDoodle,
  FlowerDoodle,
  GardenDoodle,
  GrowthDoodle,
  HouseDoodle,
  LeafDoodle,
  LeafMark,
  NotebookDoodle,
  NumbersDoodle,
  PaintDoodle,
  ShapesDoodle,
  StoryBookDoodle,
  SunDoodle,
} from "@/components/illustrations";

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

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [loginMessage, setLoginMessage] = useState("");

  const handleLogin = () => {
    try {
      startLogin();
    } catch {
      setLoginMessage("Sign-in is ready when this app is connected to its project login.");
    }
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="landing-page">
      <header className="site-header">
        <div className="site-container nav-shell">
          <a className="brand" href="/" onClick={closeMenu} aria-label="VikasSetu – Aamchi Shala home">
            <span className="brand-mark"><LeafMark /></span>
            <span className="brand-copy">
              <strong>VikasSetu</strong>
              <span>Aamchi Shala</span>
            </span>
          </a>
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
            <button className="nav-login" type="button" onClick={() => { closeMenu(); handleLogin(); }}>Log in</button>
            <button className="button button-small button-outline-forest" type="button" onClick={() => { closeMenu(); handleLogin(); }}>
              Get started <ArrowRight size={15} />
            </button>
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
                <button className="button button-primary" type="button" onClick={handleLogin}>Get started <ArrowRight size={17} /></button>
                <a className="button button-quiet" href="#activities">Explore activities <ChevronRight size={17} /></a>
              </div>
              {loginMessage && <p className="login-message" role="status">{loginMessage}</p>}
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
                    fetchPriority="high"
                  />
                </picture>
              </div>
            </div>
          </div>
          <div className="hero-rule site-container"><span>For the noticing, the trying, and the tiny breakthroughs</span><span className="rule-line" /><span className="rule-leaf"><LeafDoodle /></span></div>
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
                <article className={`domain-card ${tone}`} key={title}>
                  <div className="domain-art"><Illustration /></div>
                  <div><h3>{title}</h3><p>{copy}</p></div>
                  <span className="card-arrow" aria-hidden="true"><ArrowRight size={16} /></span>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="activities-section section-pad" id="activities" aria-labelledby="activities-title">
          <div className="site-container">
            <div className="section-intro split-intro activity-heading">
              <div><p className="section-kicker">Open-ended, everyday learning</p><h2 id="activities-title">Learning through <em>play.</em></h2></div>
              <div><p>Discover simple invitations that turn everyday moments into opportunities to explore, practise, and create.</p><a href="#activities" className="text-link">Explore all activities <ArrowRight size={16} /></a></div>
            </div>
            <div className="activity-grid">
              {playIdeas.map(({ title, domain, copy, illustration: Illustration, tone }) => (
                <article className={`activity-card ${tone}`} key={title}>
                  <div className="activity-visual"><Illustration /></div>
                  <div className="activity-content"><p className="activity-domain">{domain}</p><h3>{title}</h3><p>{copy}</p></div>
                  <span className="activity-link-note"><CircleCheck size={15} /> Classroom idea</span>
                </article>
              ))}
            </div>
            <p className="data-note"><span className="data-note-mark">i</span> These are illustrated classroom ideas for this landing page. The current starter does not expose a saved activity library or separate Activities route yet, so no activity records or statistics are being presented as product data.</p>
          </div>
        </section>

        <section className="gallery-section section-pad" aria-labelledby="gallery-title">
          <div className="site-container gallery-layout">
            <div className="gallery-copy">
              <p className="section-kicker">A wall for wonder</p>
              <h2 id="gallery-title">A little creativity goes <em>a long way.</em></h2>
              <p>Every drawing, colour, and creation is another opportunity for a child to explore the world. These fictional classroom sketches are a small celebration of that curiosity.</p>
              <div className="gallery-caption"><span className="caption-line" /><span>Fictional artwork · made for the VikasSetu story</span></div>
            </div>
            <div className="artwork-grid" aria-label="A gallery of fictional children's artwork">
              {gallery.map(({ title, illustration: Illustration, className }) => (
                <figure className={`artwork-sheet ${className}`} key={title}>
                  <div className="sheet-tape" aria-hidden="true" />
                  <Illustration aria-label={title} />
                  <figcaption>{title}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        <section className="how-section section-pad" id="how-it-works" aria-labelledby="how-title">
          <div className="site-container">
            <div className="section-intro centered-intro how-intro">
              <p className="section-kicker">A gentle rhythm for the day</p>
              <h2 id="how-title">Small observations. <em>Thoughtful next steps.</em></h2>
              <p>VikasSetu is a supportive tool—not a replacement for your judgement. You notice, choose, and reflect with the information available to you.</p>
            </div>
            <div className="steps-track">
              <div className="track-line" aria-hidden="true" />
              <article className="step-card"><div className="step-number">01</div><div className="step-illustration"><NotebookDoodle /></div><h3>Observe</h3><p>Notice a child’s interest, activity, or learning behaviour and record an observation where the system supports it.</p></article>
              <article className="step-card"><div className="step-number">02</div><div className="step-illustration"><BlocksDoodle /></div><h3>Choose an activity</h3><p>Use the available context to decide on an activity that feels relevant, playful, and right for the moment.</p></article>
              <article className="step-card"><div className="step-number">03</div><div className="step-illustration"><GrowthDoodle /></div><h3>Reflect on progress</h3><p>Record activity-trial information where supported and let your next observation grow from what you see.</p></article>
            </div>
          </div>
        </section>

        <section className="cta-section section-pad" aria-labelledby="cta-title">
          <div className="site-container cta-panel">
            <div className="cta-illustration"><GrowthDoodle /></div>
            <div className="cta-copy"><p className="section-kicker">For the next small step</p><h2 id="cta-title">Every little step <em>matters.</em></h2><p>Give every child the space, attention, and encouragement to learn in their own way.</p><div className="cta-actions"><button className="button button-primary" type="button" onClick={handleLogin}>Get started <ArrowRight size={17} /></button><a className="button button-quiet" href="#activities">Explore activities <ChevronRight size={17} /></a></div>{loginMessage && <p className="login-message" role="status">{loginMessage}</p>}</div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="site-container footer-grid">
          <div><a className="brand brand-footer" href="/" onClick={scrollToTop}><span className="brand-mark"><LeafMark /></span><span className="brand-copy"><strong>VikasSetu</strong><span>Aamchi Shala</span></span></a><p className="footer-copy">An observation-led companion for early learning, made to support the teachers who notice every little thing.</p></div>
          <div className="footer-links"><p className="footer-heading">Explore</p><a href="#moments">Why VikasSetu</a><a href="#domains">Learning paths</a><a href="#activities">Activities</a></div>
          <div className="footer-links"><p className="footer-heading">Keep going</p><a href="#how-it-works">How it works</a><button type="button" onClick={handleLogin}>Log in</button><a href="#cta-title">Get started</a></div>
        </div>
        <div className="site-container footer-bottom"><span>VikasSetu – Aamchi Shala</span><span>Small steps build big dreams.</span></div>
      </footer>
    </div>
  );
}
