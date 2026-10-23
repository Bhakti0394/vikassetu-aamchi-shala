import type { SVGProps } from "react";

export type IllustrationProps = SVGProps<SVGSVGElement>;

const line = "#29584b";
const forest = "#193e35";
const teal = "#3e8178";
const sage = "#a9c2aa";
const coral = "#d9826b";
const yellow = "#efc96e";
const paper = "#f9f1df";
const brown = "#7a5038";
const ink = "#34584d";

function svgProps(props: IllustrationProps, label?: string) {
  return {
    ...props,
    role: label ? "img" : undefined,
    "aria-label": label,
    "aria-hidden": label ? undefined : true,
    focusable: "false" as const,
  };
}

export function LeafMark(props: IllustrationProps) {
  return (
    <svg viewBox="0 0 42 42" {...svgProps(props)}>
      <path d="M20.6 32.7C13.1 28.8 10.1 20.8 13.5 12.1c6.6.2 12.3 4.7 13.2 11.2.5 3.2-.9 6.4-3.4 9.4Z" fill={sage} stroke={forest} strokeWidth="1.8" />
      <path d="M18.2 30.6c2.1-5 4.8-9.2 8.7-13.4M18.8 32.4c-1.1 2.5-2.2 4.1-4.1 5.5" fill="none" stroke={forest} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M28.4 9.8c4.7 2.7 6.6 7.4 5 12.2-4.3.2-8.1-2.5-9.1-6.6-.5-2.2 1-4.1 4.1-5.6Z" fill={yellow} stroke={forest} strokeWidth="1.8" />
    </svg>
  );
}

export function SunDoodle(props: IllustrationProps) {
  return (
    <svg viewBox="0 0 110 110" {...svgProps(props)}>
      <g fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="55" cy="55" r="19" fill={yellow} />
        <path d="M55 8v17M55 85v17M8 55h17M85 55h17M21 21l12 12M77 77l12 12M89 21 77 33M33 77 21 89" />
      </g>
      <circle cx="49" cy="51" r="2.2" fill={forest} />
      <circle cx="62" cy="51" r="2.2" fill={forest} />
      <path d="M49 61c4 3 8 3 12 0" fill="none" stroke={forest} strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function FlowerDoodle(props: IllustrationProps) {
  return (
    <svg viewBox="0 0 100 110" {...svgProps(props)}>
      <path d="M50 57v43M50 84c-14-5-20-1-25 5M50 75c12-7 18-4 24 2" fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round" />
      <path d="M25 88c8-7 15-5 24 1" fill={sage} stroke={ink} strokeWidth="2" />
      <path d="M50 88c9-9 17-8 24-1" fill={sage} stroke={ink} strokeWidth="2" />
      <g fill={coral} stroke={ink} strokeWidth="2">
        <ellipse cx="50" cy="30" rx="12" ry="19" />
        <ellipse cx="50" cy="65" rx="12" ry="19" />
        <ellipse cx="31" cy="47" rx="19" ry="12" />
        <ellipse cx="69" cy="47" rx="19" ry="12" />
      </g>
      <circle cx="50" cy="47" r="11" fill={yellow} stroke={ink} strokeWidth="2" />
    </svg>
  );
}

export function LeafDoodle(props: IllustrationProps) {
  return (
    <svg viewBox="0 0 120 100" {...svgProps(props)}>
      <path d="M21 79c19-30 42-49 77-58-3 34-25 57-62 64" fill={sage} stroke={ink} strokeWidth="3" strokeLinejoin="round" />
      <path d="M25 76c24-19 42-34 68-50M51 51l-4-20M63 42l8-19M38 64l-17-2" fill="none" stroke={ink} strokeWidth="2.3" strokeLinecap="round" />
    </svg>
  );
}

export function AlphabetDoodle(props: IllustrationProps) {
  return (
    <svg viewBox="0 0 150 100" {...svgProps(props)}>
      <g stroke={ink} strokeWidth="2.5" strokeLinejoin="round">
        <rect x="8" y="17" width="38" height="58" rx="4" fill={coral} transform="rotate(-4 8 17)" />
        <rect x="55" y="12" width="38" height="58" rx="4" fill={yellow} transform="rotate(5 55 12)" />
        <rect x="101" y="20" width="38" height="58" rx="4" fill={sage} transform="rotate(-3 101 20)" />
      </g>
      <g fill={forest} fontFamily="Georgia, serif" fontSize="28" fontWeight="700" textAnchor="middle">
        <text x="28" y="56">A</text><text x="74" y="51">B</text><text x="120" y="59">C</text>
      </g>
    </svg>
  );
}

export function NumbersDoodle(props: IllustrationProps) {
  return (
    <svg viewBox="0 0 150 100" {...svgProps(props)}>
      <path d="M17 72c17-24 44-45 86-53" fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round" strokeDasharray="2 8" />
      <g fill={teal} stroke={ink} strokeWidth="2.5">
        <rect x="16" y="36" width="30" height="30" rx="4" transform="rotate(-9 16 36)" />
        <rect x="58" y="27" width="30" height="30" rx="4" transform="rotate(5 58 27)" fill={coral} />
        <rect x="100" y="17" width="30" height="30" rx="4" transform="rotate(-4 100 17)" fill={yellow} />
      </g>
      <g fill={paper} fontFamily="Georgia, serif" fontSize="21" fontWeight="700" textAnchor="middle">
        <text x="31" y="58">1</text><text x="73" y="49">2</text><text x="115" y="39">3</text>
      </g>
    </svg>
  );
}

export function ShapesDoodle(props: IllustrationProps) {
  return (
    <svg viewBox="0 0 150 105" {...svgProps(props)}>
      <circle cx="27" cy="52" r="19" fill={coral} stroke={ink} strokeWidth="3" />
      <rect x="53" y="31" width="38" height="38" fill={yellow} stroke={ink} strokeWidth="3" transform="rotate(14 72 50)" />
      <path d="m125 27 23 45H102Z" fill={sage} stroke={ink} strokeWidth="3" strokeLinejoin="round" />
      <path d="M12 87c34 6 77 6 126-1" fill="none" stroke={ink} strokeWidth="2" strokeLinecap="round" strokeDasharray="1 7" />
    </svg>
  );
}

export function PaintDoodle(props: IllustrationProps) {
  return (
    <svg viewBox="0 0 150 105" {...svgProps(props)}>
      <path d="M23 69c18-17 45-24 68-15 7 3 9 10 3 15-8 7-19 4-29 2-15-3-26 3-42 7Z" fill={coral} stroke={ink} strokeWidth="3" strokeLinejoin="round" />
      <circle cx="43" cy="61" r="5" fill={yellow} stroke={ink} strokeWidth="2" />
      <circle cx="61" cy="57" r="5" fill={sage} stroke={ink} strokeWidth="2" />
      <circle cx="78" cy="60" r="5" fill={yellow} stroke={ink} strokeWidth="2" />
      <path d="M101 70 126 20" fill="none" stroke={brown} strokeWidth="6" strokeLinecap="round" />
      <path d="m119 27 11-12 5 11-11 11" fill={teal} stroke={ink} strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  );
}

export function StoryBookDoodle(props: IllustrationProps) {
  return (
    <svg viewBox="0 0 150 110" {...svgProps(props)}>
      <path d="M10 30c19-10 39-10 64 1v61c-24-10-45-10-64-1ZM140 30c-19-10-39-10-64 1v61c24-10 45-10 64-1Z" fill={paper} stroke={ink} strokeWidth="3" strokeLinejoin="round" />
      <path d="M74 31v61M24 48c12-5 27-5 42 1M126 48c-12-5-27-5-42 1" fill="none" stroke={teal} strokeWidth="2" strokeLinecap="round" />
      <path d="M33 69c7-10 15-10 22 0" fill="none" stroke={coral} strokeWidth="3" strokeLinecap="round" />
      <circle cx="111" cy="68" r="10" fill={yellow} stroke={coral} strokeWidth="2" />
      <path d="M104 69h14M111 62v13" stroke={ink} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function BlocksDoodle(props: IllustrationProps) {
  return (
    <svg viewBox="0 0 140 110" {...svgProps(props)}>
      <path d="M18 80h104" stroke={ink} strokeWidth="3" strokeLinecap="round" />
      <g stroke={ink} strokeWidth="2.5" strokeLinejoin="round">
        <rect x="18" y="54" width="34" height="26" fill={coral} />
        <rect x="53" y="34" width="34" height="46" fill={yellow} />
        <rect x="88" y="49" width="34" height="31" fill={teal} />
        <circle cx="35" cy="67" r="6" fill={paper} />
        <circle cx="70" cy="47" r="6" fill={paper} />
        <circle cx="105" cy="64" r="6" fill={paper} />
      </g>
    </svg>
  );
}

export function NotebookDoodle(props: IllustrationProps) {
  return (
    <svg viewBox="0 0 140 110" {...svgProps(props)}>
      <path d="m29 20 87 13-11 63-87-13Z" fill={paper} stroke={ink} strokeWidth="3" strokeLinejoin="round" />
      <path d="m47 35 50 8M43 48l37 6M40 62l53 8M36 76l27 4" fill="none" stroke={teal} strokeWidth="2.5" strokeLinecap="round" />
      <path d="m40 20 6-9M57 23l5-10M75 25l4-10M93 27l3-9" stroke={coral} strokeWidth="3" strokeLinecap="round" />
      <circle cx="91" cy="76" r="9" fill={yellow} stroke={ink} strokeWidth="2" />
      <path d="m87 76 3 3 6-7" fill="none" stroke={forest} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function GrowthDoodle(props: IllustrationProps) {
  return (
    <svg viewBox="0 0 150 125" {...svgProps(props)}>
      <path d="M75 106V66M75 78c-13-12-24-13-34-8M75 89c12-13 23-15 35-10" fill="none" stroke={ink} strokeWidth="4" strokeLinecap="round" />
      <path d="M75 68c-13-20-9-35 0-49 10 15 13 29 0 49Z" fill={sage} stroke={ink} strokeWidth="3" />
      <path d="M40 111h71" stroke={brown} strokeWidth="6" strokeLinecap="round" />
      <path d="M49 105c8-7 18-8 26-4 8-5 18-4 25 4" fill={yellow} stroke={ink} strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx="75" cy="19" r="7" fill={coral} stroke={ink} strokeWidth="2.5" />
      <path d="M75 3v7M60 7l5 5M90 7l-5 5" stroke={ink} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function HouseDoodle(props: IllustrationProps) {
  return (
    <svg viewBox="0 0 160 120" {...svgProps(props)}>
      <path d="m26 56 53-39 54 39v47H26Z" fill={paper} stroke={ink} strokeWidth="3" strokeLinejoin="round" />
      <path d="M17 58 79 11l63 47" fill="none" stroke={coral} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="65" y="74" width="24" height="29" fill={teal} stroke={ink} strokeWidth="2.5" />
      <rect x="39" y="63" width="18" height="18" fill={yellow} stroke={ink} strokeWidth="2.5" />
      <rect x="98" y="63" width="18" height="18" fill={sage} stroke={ink} strokeWidth="2.5" />
      <path d="M15 105h130M25 97c9-12 14-12 21 0M121 97c7-13 13-11 20 0" fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function GardenDoodle(props: IllustrationProps) {
  return (
    <svg viewBox="0 0 170 120" {...svgProps(props)}>
      <path d="M20 101c18-25 40-29 64-20 21-14 44-10 66 20" fill={sage} stroke={ink} strokeWidth="3" strokeLinejoin="round" />
      <path d="M82 101V47M82 65c-17-12-26-9-36-2M82 78c17-15 28-14 39-6" fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round" />
      <circle cx="82" cy="42" r="14" fill={yellow} stroke={coral} strokeWidth="3" />
      <path d="M46 20c8 6 11 13 8 22-9-1-15-7-15-15 0-4 2-6 7-7ZM130 28c8 5 10 12 6 20-8-1-13-6-13-14 0-3 2-5 7-6Z" fill={paper} stroke={ink} strokeWidth="2.5" />
      <path d="M21 103h128" stroke={brown} strokeWidth="5" strokeLinecap="round" />
      <path d="M31 96c2-10 8-14 15-15M124 94c2-11 8-14 15-16" fill="none" stroke={coral} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function ClassroomScene(props: IllustrationProps) {
  return (
    <svg viewBox="0 0 690 550" {...svgProps(props, "A warm storybook classroom where Tara explores counting blocks with a supportive teacher while classmates draw and play") }>
      <path d="M63 188C43 95 146 47 278 71c145-32 299 7 351 104 47 88 8 230-83 294-96 68-230 57-341 25C110 463 77 373 63 188Z" fill="#f8f0df" />
      <path d="M92 406c98-48 207-45 306-5 93-43 165-39 238 7" fill="none" stroke="#d7c7aa" strokeWidth="23" strokeLinecap="round" opacity=".62" />
      <path d="M112 421c93-35 190-31 278 4 81-34 151-30 218 1" fill="none" stroke="#c7d9c5" strokeWidth="6" strokeLinecap="round" />
      <rect x="95" y="104" width="165" height="125" rx="12" fill="#e1f0e9" stroke={ink} strokeWidth="3" />
      <path d="M177 105v123M96 166h163" stroke={ink} strokeWidth="2.5" />
      <path d="M112 202c32-25 52-22 75-4 21-24 40-18 58-2" fill="none" stroke={teal} strokeWidth="3.5" strokeLinecap="round" />
      <path d="M477 111c10-13 20-13 30 0M507 111c10-13 20-13 30 0" fill="none" stroke={coral} strokeWidth="3" strokeLinecap="round" />
      <path d="M164 83h38M183 64v38" stroke={yellow} strokeWidth="5" strokeLinecap="round" />
      <path d="M118 263h143M128 257v-34M239 257v-34" stroke={forest} strokeWidth="3" strokeLinecap="round" />
      <path d="M129 247c16-14 32-14 48 0M187 247c17-15 34-13 49 0" fill={paper} stroke={coral} strokeWidth="2.2" />
      <rect x="500" y="214" width="112" height="151" rx="7" fill={sage} stroke={ink} strokeWidth="3.5" />
      <path d="M514 235h84M514 258h84M514 281h84M514 304h84" stroke={forest} strokeWidth="2.3" strokeLinecap="round" />
      <rect x="522" y="320" width="19" height="25" fill={coral} stroke={forest} strokeWidth="2" /><rect x="547" y="312" width="19" height="33" fill={yellow} stroke={forest} strokeWidth="2" /><rect x="572" y="324" width="19" height="21" fill={teal} stroke={forest} strokeWidth="2" />
      <path d="M516 219c4-9 10-9 14 0M536 219c4-9 10-9 14 0M556 219c4-9 10-9 14 0" fill="none" stroke={coral} strokeWidth="3" strokeLinecap="round" />
      <path d="M84 343c0-24 13-43 30-43s30 19 30 43" fill={sage} stroke={ink} strokeWidth="3" /><path d="M96 303c0-13 8-21 18-21s18 8 18 21" fill={brown} stroke={ink} strokeWidth="3" /><path d="M81 352h67" stroke={brown} strokeWidth="6" strokeLinecap="round" />
      <path d="M597 376c0-30 13-50 30-50s30 20 30 50" fill={sage} stroke={ink} strokeWidth="3" /><path d="M611 328c0-15 8-23 17-23s17 8 17 23" fill={brown} stroke={ink} strokeWidth="3" /><path d="M595 384h69" stroke={brown} strokeWidth="6" strokeLinecap="round" />
      <circle cx="113" cy="309" r="3" fill={forest} /><circle cx="129" cy="309" r="3" fill={forest} /><path d="M114 322c5 4 10 4 15 0" fill="none" stroke={forest} strokeWidth="2" strokeLinecap="round" />
      <circle cx="625" cy="334" r="3" fill={forest} /><circle cx="641" cy="334" r="3" fill={forest} /><path d="M626 347c5 4 10 4 15 0" fill="none" stroke={forest} strokeWidth="2" strokeLinecap="round" />
      <path d="M118 331c-9 9-14 25-14 48h45c0-24-8-40-21-48Z" fill={yellow} stroke={ink} strokeWidth="3" /><path d="M604 354c-9 9-14 25-14 43h45c0-19-8-34-21-43Z" fill={coral} stroke={ink} strokeWidth="3" />
      <path d="M139 346c18-4 30 0 42 9" fill="none" stroke="#9c6749" strokeWidth="7" strokeLinecap="round" /><path d="M605 365c-14 8-20 17-22 29" fill="none" stroke="#b37855" strokeWidth="7" strokeLinecap="round" />
      <path d="M154 394h25M614 405h25" stroke={teal} strokeWidth="7" strokeLinecap="round" />
      <g transform="translate(82 18)">
      <path d="M252 302c25-19 58-22 87-7 26 14 44 39 50 72l-12 48H245l-8-49c2-28 7-49 15-64Z" fill={sage} stroke={forest} strokeWidth="4" />
      <circle cx="318" cy="257" r="37" fill="#9c6749" stroke={forest} strokeWidth="4" />
      <path d="M284 253c1-31 24-48 53-42 18 4 29 18 30 37-14-13-27-17-39-13-17 5-27 12-44 27Z" fill={brown} stroke={forest} strokeWidth="4" />
      <path d="M352 224c18-10 29-3 27 9-2 12-14 18-29 13" fill={brown} stroke={forest} strokeWidth="4" strokeLinecap="round" />
      <circle cx="304" cy="258" r="3" fill={forest} /><circle cx="330" cy="258" r="3" fill={forest} /><path d="M307 273c8 7 16 7 24 0" fill="none" stroke={forest} strokeWidth="3" strokeLinecap="round" />
      <path d="M282 313c-28 11-45 29-57 56M356 316c21 4 38 14 53 31" fill="none" stroke="#9c6749" strokeWidth="13" strokeLinecap="round" />
      <path d="M260 393c-2 21-5 39-9 58M348 393c4 21 7 39 10 58" fill="none" stroke={teal} strokeWidth="16" strokeLinecap="round" />
      <path d="M240 455h38M345 455h39" stroke={forest} strokeWidth="9" strokeLinecap="round" />
      </g>
      <circle cx="249" cy="233" r="13" fill={brown} stroke={forest} strokeWidth="3" /><circle cx="387" cy="255" r="13" fill={brown} stroke={forest} strokeWidth="3" />
      <circle cx="318" cy="276" r="31" fill="#9c6749" stroke={forest} strokeWidth="4" /><path d="M290 270c4-27 37-39 58-22-14-2-24 3-35 14-7 7-14 10-23 14Z" fill={brown} stroke={forest} strokeWidth="3.5" />
      <path d="M289 302c-18 12-28 34-28 59h115c-2-26-13-48-31-59Z" fill={coral} stroke={forest} strokeWidth="4" />
      <path d="M282 326c-13 6-24 15-33 26M350 325c14 1 26 7 37 18" fill="none" stroke="#9c6749" strokeWidth="10" strokeLinecap="round" />
      <path d="M285 376h30M350 376h30" stroke={teal} strokeWidth="9" strokeLinecap="round" />
      <circle cx="307" cy="278" r="3" fill={forest} /><circle cx="327" cy="278" r="3" fill={forest} /><path d="M308 289c5 4 10 4 15 0" fill="none" stroke={forest} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M220 356c44-12 111-12 193 0l-11 34c-54 10-113 10-171 0Z" fill="#c99662" stroke={forest} strokeWidth="4" />
      <path d="M238 389v64M395 389v64" stroke={forest} strokeWidth="8" strokeLinecap="round" />
      <path d="M229 452h20M385 452h20" stroke={forest} strokeWidth="7" strokeLinecap="round" />
      <rect x="278" y="335" width="29" height="25" rx="3" fill={coral} stroke={forest} strokeWidth="2.5" transform="rotate(-7 278 335)" /><rect x="310" y="327" width="29" height="30" rx="3" fill={yellow} stroke={forest} strokeWidth="2.5" transform="rotate(5 310 327)" /><rect x="343" y="335" width="29" height="23" rx="3" fill={teal} stroke={forest} strokeWidth="2.5" transform="rotate(-3 343 335)" />
      <path d="M216 465c61 15 137 15 205 0" fill="none" stroke={coral} strokeWidth="3" strokeLinecap="round" strokeDasharray="2 10" />
      <path d="M45 385c13-26 28-39 48-43-2 28-18 46-43 50" fill={sage} stroke={ink} strokeWidth="3" /><path d="M51 385c15-18 25-27 37-35" fill="none" stroke={ink} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M63 420h31M70 420v-30M87 420v-24" stroke={brown} strokeWidth="5" strokeLinecap="round" /><path d="M61 398c9-8 18-8 27 0" fill={sage} stroke={ink} strokeWidth="2" />
      <path d="M652 179c9-15 20-20 35-18-2 17-13 28-30 29" fill={coral} stroke={ink} strokeWidth="3" /><path d="M658 184c9-8 17-14 26-19" fill="none" stroke={ink} strokeWidth="2" />
      <path d="M70 138c9-12 19-12 28 0M97 138c9-12 19-12 28 0" fill="none" stroke={teal} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
