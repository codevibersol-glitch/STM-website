import { useEffect, useId, useState } from 'react';
import { blip } from '../lib/sound';
import { canBe, defaultRace, RACES, type RaceDef } from '../talents/races';
import {
  POINT_CAP,
  addPoint,
  canAdd,
  canRemove,
  emptyPlan,
  rankOf,
  ranksFromOrder,
  removePoint,
  totalPoints,
  type Plan,
} from '../talents/rules';
import { readStoredPlan, writeStoredPlan } from '../talents/share';
import {
  CLIENT_BUILD,
  FIRST_TALENT_LEVEL,
  LEVELING_NOTE,
  classById,
  classTrees,
  findTalent,
  levelForPoints,
  ordersFor,
  treeOf,
  PLANNER_CLASSES,
  type PlannerClassId,
  type TalentDef,
} from '../talents/trees';

const PROFESSIONS =
  'STM pairs a gathering skill with a crafting skill: Mining and Engineering, Herbalism and Alchemy, Skinning and Leatherworking, or Tailoring and Enchanting. The app chooses the pair for the class. FLEX stays grind-only and does not run professions. Fishing is still coming soon.';

function usePlan() {
  const [plan, setPlan] = useState<Plan>(emptyPlan());
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const stored = readStoredPlan();
    if (stored) setPlan(stored);
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) writeStoredPlan(plan);
  }, [plan, ready]);
  return [plan, setPlan] as const;
}

export function ForeverPlanner() {
  const [plan, setPlan] = usePlan();
  const [selected, setSelected] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [copied, setCopied] = useState(false);
  const [tips, setTips] = useState<Record<string, string[]> | null>(null);
  const sheetId = useId();
  const trees = classTrees(plan.classId);
  const spent = totalPoints(plan.classId, plan.ranks);
  const talent = selected ? findTalent(plan.classId, selected) : trees[0]?.talents[0];
  const selectedId = talent?.id ?? '';
  const rank = talent ? rankOf(plan.ranks, talent.id) : 0;
  const orders = ordersFor(plan.classId);
  const popular = orders[0];

  useEffect(() => {
    let live = true;
    void import('../talents/generated/tips.json').then((mod) => {
      if (live) setTips(mod.default as Record<string, string[]>);
    });
    return () => {
      live = false;
    };
  }, []);

  const chooseClass = (classId: PlannerClassId) => {
    const raceId = canBe(plan.raceId, classId) ? plan.raceId : defaultRace(classId);
    setPlan(emptyPlan(classId, raceId));
    setSelected(null);
    setNote('');
  };

  const spend = (talentId: string, mode: 'add' | 'remove') => {
    const next = mode === 'add' ? addPoint(plan.classId, plan.ranks, talentId) : removePoint(plan.classId, plan.ranks, talentId);
    setNote(next.result.ok ? '' : next.result.reason);
    if (!next.result.ok) return;
    setPlan({ ...plan, ranks: next.ranks });
    blip();
  };

  const applyOrder = (spec: string) => {
    const ranks = ranksFromOrder(plan.classId, spec);
    if (!ranks) {
      setNote('That order does not fit the current tree.');
      return;
    }
    setPlan({ ...plan, ranks });
    setNote('');
    blip();
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
    } catch {
      setCopied(false);
      setNote('Copy the address in the bar. It holds this build.');
    }
  };

  const tip = talent && tips ? tips[talent.id]?.[Math.max(0, rank - 1)] ?? tips[talent.id]?.at(-1) : undefined;

  return (
    <div data-planner>
      <div className="planner-head">
        <p className="planner-points">
          {spent} spent of {POINT_CAP}. {spent === 0 ? `The first point opens at level ${FIRST_TALENT_LEVEL}.` : `This build fits level ${levelForPoints(spent)}.`}
        </p>
        <div className="quest-track" aria-hidden="true">
          <span style={{ width: `${(spent / POINT_CAP) * 100}%` }} />
        </div>
      </div>

      <p className="fighter-label">Class</p>
      <div className="planner-actions">
        {PLANNER_CLASSES.map((item) => (
          <button key={item.id} type="button" className="choice" aria-pressed={plan.classId === item.id} onClick={() => chooseClass(item.id)}>
            {item.name}
          </button>
        ))}
      </div>

      <RaceRows plan={plan} onChange={setPlan} />

      <p className="planner-scope">
        {classById(plan.classId)?.name} leveling talents follow the most common planner order
        {popular ? `, ${popular.spec}` : ''}. {LEVELING_NOTE} STM spends the next point on level-up. STM quests a level band when it has a route for it, and grinds when that band has none. {PROFESSIONS}
      </p>

      {orders.length > 0 ? (
        <>
          <p className="fighter-label">Leveling orders from planner popularity</p>
          <div className="planner-actions">
            {orders.map((order) => (
              <button key={order.spec} type="button" className="choice" onClick={() => applyOrder(order.spec)}>
                {order.spec}
              </button>
            ))}
            <button type="button" className="choice" onClick={() => setPlan({ ...plan, ranks: {} })}>
              Clear points
            </button>
          </div>
          <ul className="order-shares">
            {orders.map((order) => (
              <li key={order.spec}>
                {order.spec}: {order.share}
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <div className="talent-board">
        {trees.map((tree) => (
          <section key={tree.name} className="talent-tree" aria-label={tree.name}>
            <h3 style={{ color: classById(plan.classId)?.color }}>{tree.name}</h3>
            <div className="talent-grid">
              {tree.talents.map((item) => (
                <TalentButton
                  key={item.id}
                  talent={item}
                  rank={rankOf(plan.ranks, item.id)}
                  selected={item.id === selectedId}
                  sheetId={sheetId}
                  onSelect={() => setSelected(item.id)}
                  onKeySpend={(mode) => spend(item.id, mode)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      {talent ? (
        <div className="talent-sheet wow-tip" id={sheetId} aria-live="polite">
          <p className="tip-name">{talent.name}</p>
          <p className="tip-rank">
            Rank {rank} of {talent.maxRank}. {talent.status === 'unchanged' ? 'Same as Classic.' : talent.status === 'new' ? 'New on Forever.' : 'Changed on Forever.'}
          </p>
          <p>{tip ?? 'The rank text loads with the page script.'}</p>
          {talent.requires ? (
            <p>Needs {findTalent(plan.classId, talent.requires)?.name ?? 'the talent before it'} at rank {talent.requireRank}.</p>
          ) : null}
          <p>{treeOf(plan.classId, talent.id)?.name}. This row opens after {talent.row * 5} points in that tree.</p>
          <div className="talent-sheet-actions">
            <button type="button" className="btn btn-gold btn-sm" disabled={!canAdd(plan.classId, plan.ranks, talent.id).ok} onClick={() => spend(talent.id, 'add')}>
              Add a point to {talent.name}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" disabled={!canRemove(plan.classId, plan.ranks, talent.id).ok} onClick={() => spend(talent.id, 'remove')}>
              Remove a point from {talent.name}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => void copyLink()}>
              {copied ? 'Link copied' : 'Copy build link'}
            </button>
          </div>
        </div>
      ) : null}
      <p className="planner-scope" role="status">
        {note}
      </p>
      <p className="planner-scope">
        Trees from WoW Forever client {CLIENT_BUILD}, gathered by wowforevertalents.com, compared with Classic Era. Leveling orders from talentsforever.com, CC BY 4.0. The normal rule is one point each level from {FIRST_TALENT_LEVEL}, never more than {POINT_CAP}. The Legacy perk Talented can open the first point earlier. This page does not apply that perk. A shared link is the address of this page.
      </p>
      <i data-planner-end="" hidden />
    </div>
  );
}

function RaceRows({ plan, onChange }: { plan: Plan; onChange: (plan: Plan) => void }) {
  const groups: { faction: RaceDef['faction']; label: string }[] = [
    { faction: 'alliance', label: 'Alliance' },
    { faction: 'horde', label: 'Horde' },
  ];
  return (
    <>
      {groups.map((group) => (
        <div key={group.faction}>
          <p className="fighter-label">{group.label}</p>
          <div className="planner-actions">
            {RACES.filter((race) => race.faction === group.faction).map((race) => {
              const legal = canBe(race.id, plan.classId);
              return (
                <button
                  key={race.id}
                  type="button"
                  className="choice"
                  aria-pressed={plan.raceId === race.id}
                  disabled={!legal}
                  onClick={() => onChange({ ...plan, raceId: race.id })}
                >
                  {race.name}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}

function TalentButton({
  talent,
  rank,
  selected,
  sheetId,
  onSelect,
  onKeySpend,
}: {
  talent: TalentDef;
  rank: number;
  selected: boolean;
  sheetId: string;
  onSelect: () => void;
  onKeySpend: (mode: 'add' | 'remove') => void;
}) {
  return (
    <button
      type="button"
      className={rank > 0 ? 'talent-node is-spent' : 'talent-node'}
      style={{ gridRow: talent.row + 1, gridColumn: talent.col + 1 }}
      aria-pressed={selected}
      aria-label={`${talent.name}, rank ${rank} of ${talent.maxRank}`}
      aria-describedby={selected ? sheetId : undefined}
      onClick={onSelect}
      onFocus={onSelect}
      onKeyDown={(event) => {
        if (event.key === '+' || event.key === '=') {
          event.preventDefault();
          onKeySpend('add');
        } else if (event.key === '-' || event.key === '_') {
          event.preventDefault();
          onKeySpend('remove');
        }
      }}
    >
      <span className="talent-node-name">{talent.name}</span>
      <span className="talent-node-rank">
        {rank}/{talent.maxRank}
      </span>
    </button>
  );
}
