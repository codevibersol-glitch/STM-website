import { SectionHead } from './Sections';

const ITEMS = [
  {
    id: 'talents',
    state: 'done',
    title: 'Talents on level-up',
    text: 'STM spends the next talent point when the character levels, from the plan you set. The calculator on this site uses the same WoW Forever trees.',
  },
  {
    id: 'plan',
    state: 'done',
    title: 'A plan builder on the dashboard',
    text: 'The dashboard on your PC holds the plan: class, talents, the quest route and the grind. You can see what STM is doing now and what it will do next.',
  },
  {
    id: 'install',
    state: 'done',
    title: 'A Windows installer',
    text: 'STM-Setup.exe installs the companion. Windows may warn that the publisher is unsigned. The install page walks through that warning, running as administrator, and the first launch.',
  },
  {
    id: 'routes',
    state: 'current',
    title: 'Quest routes and grind plans',
    text: 'STM quests a level band when it has a route for it, and grinds when that band has none. This is not a promise that every quest is in the route.',
  },
  {
    id: 'professions',
    state: 'current',
    title: 'Profession pairs',
    text: 'On GO and Founder, STM pairs a gathering skill with a crafting skill: Mining and Engineering, Herbalism and Alchemy, Skinning and Leatherworking, or Tailoring and Enchanting. FLEX stays grind-only. Fishing is still coming soon.',
  },
] as const;

export function WhatsNew() {
  return (
    <section id="whats-new" className="section page-new" aria-labelledby="whats-new-title">
      <div className="wrap">
        <figure className="race-banner">
          <img
            src="/media/races-still.jpg"
            width={960}
            height={540}
            alt="AI art of a Horde and Alliance host under banners. Not gameplay."
            loading="lazy"
          />
          <figcaption>Trailer made with AI (Grok Imagine). Not gameplay. STM is not affiliated with Blizzard Entertainment.</figcaption>
        </figure>
        <SectionHead
          id="whats-new-title"
          eyebrow="What's new"
          title="The WoW Forever update"
          intro="STM now plays WoW Forever, for Horde and Alliance. These are the parts in this update. Measured results stay on their own page."
        />
        <ol className="quest-log">
          {ITEMS.map((item) => (
            <li key={item.id} data-state={item.state}>
              <span className="quest-mark" aria-hidden="true" />
              <div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="section-intro">
          <a className="btn btn-gold" href="/talents">
            Open the talent calculator
          </a>{' '}
          <a className="btn btn-ghost" href="/install">
            Read the install steps
          </a>
        </p>
      </div>
    </section>
  );
}
