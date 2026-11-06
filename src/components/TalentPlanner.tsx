import { useEffect, useState } from 'react';
import { canBe, RACES } from '../talents/races';
import { POINT_CAP, addPoint, canAdd, canRemove, emptyPlan, rankOf, removePoint, suggestClass, totalPoints, type Plan } from '../talents/rules';
import { readStoredPlan, writeStoredPlan } from '../talents/share';
import { classTrees, PLANNER_CLASSES, UNSUPPORTED_CLASSES, type PlannerClassId } from '../talents/trees';

const DEMO_NOTE = 'The demos on Play are sample models. They do not read this build, and this build does not set up STM.';

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

export function useFighterPlan() {
  return usePlan();
}

export function ClassChoices({ plan, onChange }: { plan: Plan; onChange: (plan: Plan) => void }) {
  const [weapon, setWeapon] = useState<'two-hand' | 'dagger' | null>(null);
  const chooseClass = (classId: PlannerClassId) => {
    const raceId = canBe(plan.raceId, classId) ? plan.raceId : 'human';
    onChange(classId === plan.classId ? { ...plan, raceId } : emptyPlan(classId, raceId));
  };
  const chooseRole = (role: 'line' | 'unseen' | 'damage') => {
    const classId = suggestClass(role, weapon ?? undefined);
    if (classId) chooseClass(classId);
  };
  return (
    <div className="planner-choices">
      <p className="fighter-label">What should the character do?</p>
      <div className="planner-actions">
        <button type="button" className="choice" onClick={() => chooseRole('line')}>
          Hold a line
        </button>
        <button type="button" className="choice" onClick={() => chooseRole('unseen')}>
          Stay unseen
        </button>
        <button type="button" className="choice" onClick={() => chooseRole('damage')}>
          Deal damage
        </button>
      </div>
      <p className="fighter-label">For damage, which weapon?</p>
      <div className="planner-actions">
        <button
          type="button"
          className="choice"
          aria-pressed={weapon === 'two-hand'}
          onClick={() => {
            setWeapon('two-hand');
            chooseClass('warrior');
          }}
        >
          A two-handed weapon
        </button>
        <button
          type="button"
          className="choice"
          aria-pressed={weapon === 'dagger'}
          onClick={() => {
            setWeapon('dagger');
            chooseClass('rogue');
          }}
        >
          Daggers
        </button>
      </div>
      <p className="fighter-label">Class</p>
      <div className="planner-actions">
        {PLANNER_CLASSES.map((item) => (
          <button
            key={item.id}
            type="button"
            className="choice"
            aria-pressed={plan.classId === item.id}
            onClick={() => chooseClass(item.id)}
          >
            {item.name}
          </button>
        ))}
      </div>
      <p className="planner-scope">
        This planner has the vanilla {PLANNER_CLASSES.map((item) => item.name.toLowerCase()).join(' and ')} trees. {UNSUPPORTED_CLASSES.join(', ')} are not in it yet.
      </p>
      <p className="fighter-label">Race</p>
      <div className="planner-actions">
        {RACES.map((race) => {
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
      <p className="planner-scope">A Tauren can be a warrior. A Tauren cannot be a rogue.</p>
    </div>
  );
}

function mark(name: string) {
  const n = name.toLowerCase();
  if (/shield|block|wall|bash/.test(n)) return 'M4 4h16v10l-8 6-8-6V4z';
  if (/poison|blood|wound|hemorr|lethal/.test(n)) return 'M12 3s6 6 6 10a6 6 0 1 1-12 0c0-4 6-10 6-10z';
  if (/shout|voice|howl|cruel/.test(n)) return 'M5 9h4l6-4v14l-6-4H5V9z';
  if (/charge|sprint|intercept|rush/.test(n)) return 'M4 16l6-8 3 3 7-9';
  if (/stealth|decept|camou|ghost|sap|ambush|opport/.test(n)) return 'M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12z';
  return 'M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3z';
}

export function TalentTrees({ plan, onChange }: { plan: Plan; onChange: (plan: Plan) => void }) {
  const trees = classTrees(plan.classId);
  const [treeId, setTreeId] = useState(trees[0]?.id ?? '');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const tree = trees.find((item) => item.id === treeId) ?? trees[0]!;
  const selected = tree.talents.find((item) => item.id === selectedId) ?? null;
  const spent = totalPoints(plan.classId, plan.ranks);
  const inTree = tree.talents.reduce((sum, talent) => sum + rankOf(plan.ranks, talent.id), 0);
  const add = selected ? canAdd(plan.classId, plan.ranks, selected.id) : null;
  const remove = selected ? canRemove(plan.classId, plan.ranks, selected.id) : null;
  const byId = new Map(tree.talents.map((talent) => [talent.id, talent]));
  return (
    <div data-planner>
      <div className="planner-head">
        <p className="planner-points">
          {spent} spent. {POINT_CAP - spent} left. {tree.name} has {inTree}.
        </p>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange({ ...plan, ranks: {} })}>
          Reset points
        </button>
      </div>
      <div className="planner-actions" role="tablist" aria-label="Talent trees">
        {trees.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            className="tab"
            aria-selected={item.id === tree.id}
            onClick={() => {
              setTreeId(item.id);
              setSelectedId(null);
            }}
          >
            {item.name}
          </button>
        ))}
      </div>
      <div className="talent-board">
        <svg className="talent-links" viewBox="0 0 4 7" preserveAspectRatio="none" aria-hidden="true">
          {tree.talents.map((talent) => {
            if (!talent.requires) return null;
            const prior = byId.get(talent.requires);
            if (!prior) return null;
            return (
              <line
                key={talent.id}
                x1={prior.col + 0.5}
                y1={prior.tier + 0.5}
                x2={talent.col + 0.5}
                y2={talent.tier + 0.5}
              />
            );
          })}
        </svg>
        {tree.talents.map((talent) => {
          const rank = rankOf(plan.ranks, talent.id);
          const open = canAdd(plan.classId, plan.ranks, talent.id).ok;
          const state = rank >= talent.ranks ? 'maxed' : rank > 0 ? 'spent' : open ? 'available' : 'locked';
          return (
            <button
              key={talent.id}
              type="button"
              className="talent-node"
              data-state={state}
              style={{ gridColumn: talent.col + 1, gridRow: talent.tier + 1 }}
              aria-expanded={selected?.id === talent.id}
              aria-label={`${talent.name}, ${rank} of ${talent.ranks}, ${state}`}
              onClick={() => setSelectedId(talent.id)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d={mark(talent.name)} fill="none" stroke="currentColor" strokeWidth="1.7" />
              </svg>
              <span className="talent-badge">
                {rank}/{talent.ranks}
              </span>
            </button>
          );
        })}
      </div>
      {selected && add && remove ? (
        <div className="talent-sheet" role="region" aria-live="polite" aria-label={selected.name}>
          <p>
            <strong>{selected.name}</strong>. Rank {rankOf(plan.ranks, selected.id)} of {selected.ranks}.{' '}
            {selected.tier === 0 ? 'First row.' : `Needs ${selected.tier * 5} points in ${tree.name}.`}
            {selected.requires ? ` Needs a point in ${byId.get(selected.requires)?.name}.` : ''}
          </p>
          <p>{add.ok ? 'A point can be added.' : add.reason}</p>
          <div className="talent-sheet-actions">
            <button
              type="button"
              className="btn btn-gold"
              disabled={!add.ok}
              aria-label={`Add a point to ${selected.name}`}
              onClick={() => onChange({ ...plan, ranks: addPoint(plan.classId, plan.ranks, selected.id).ranks })}
            >
              Add
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={!remove.ok}
              aria-label={`Remove a point from ${selected.name}`}
              onClick={() => onChange({ ...plan, ranks: removePoint(plan.classId, plan.ranks, selected.id).ranks })}
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <p className="planner-scope">Tap a talent to read it and spend or take back a point.</p>
      )}
      <i data-planner-end></i>
    </div>
  );
}

export function PlanSummary({ plan }: { plan: Plan }) {
  const race = RACES.find((item) => item.id === plan.raceId);
  const kind = PLANNER_CLASSES.find((item) => item.id === plan.classId);
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    writeStoredPlan(plan);
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  return (
    <div className="planner-summary">
      <p>
        {race?.name} {kind?.name}. The point total is on the Talents tab. This build stays in the address, so the link is the save.
      </p>
      <button type="button" className="btn btn-ghost" onClick={() => void copy()}>
        {copied ? 'Link copied' : 'Copy the build link'}
      </button>
      <p>{DEMO_NOTE}</p>
      <p>
        <a href="/play">Open the sample demos</a>
      </p>
    </div>
  );
}
