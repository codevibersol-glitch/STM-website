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
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => chooseRole('line')}>
          Hold a line
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => chooseRole('unseen')}>
          Stay unseen
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => chooseRole('damage')}>
          Deal damage
        </button>
      </div>
      <p className="fighter-label">For damage, which weapon?</p>
      <div className="planner-actions">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
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
          className="btn btn-ghost btn-sm"
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
            className="btn btn-ghost btn-sm"
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
              className="btn btn-ghost btn-sm"
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

export function TalentTrees({ plan, onChange }: { plan: Plan; onChange: (plan: Plan) => void }) {
  const trees = classTrees(plan.classId);
  const [treeId, setTreeId] = useState(trees[0]?.id ?? '');
  const tree = trees.find((item) => item.id === treeId) ?? trees[0]!;
  const spent = totalPoints(plan.classId, plan.ranks);
  const inTree = tree.talents.reduce((sum, talent) => sum + rankOf(plan.ranks, talent.id), 0);
  return (
    <div data-planner>
      <p className="planner-points">
        {spent} of {POINT_CAP} points. {tree.name} has {inTree}.
      </p>
      <div className="planner-actions" role="tablist" aria-label="Talent trees">
        {trees.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            className="btn btn-ghost btn-sm"
            aria-selected={item.id === tree.id}
            onClick={() => setTreeId(item.id)}
          >
            {item.name}
          </button>
        ))}
      </div>
      {[0, 1, 2, 3, 4, 5, 6].map((tier) => {
        const row = tree.talents.filter((talent) => talent.tier === tier);
        if (row.length === 0) return null;
        return (
          <div key={tier} className="talent-tier">
            <p className="fighter-label">{tier === 0 ? 'First row' : `Needs ${tier * 5} points in ${tree.name}`}</p>
            <ul className="talent-list">
              {row.map((talent) => {
                const rank = rankOf(plan.ranks, talent.id);
                const add = canAdd(plan.classId, plan.ranks, talent.id);
                const remove = canRemove(plan.classId, plan.ranks, talent.id);
                return (
                  <li key={talent.id} className="talent">
                    <span className="talent-name">{talent.name}</span>
                    <span className="talent-rank">
                      {rank} of {talent.ranks}
                    </span>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      disabled={!add.ok}
                      aria-label={add.ok ? `Add a point to ${talent.name}` : `Add a point to ${talent.name}. ${add.reason}`}
                      onClick={() => onChange({ ...plan, ranks: addPoint(plan.classId, plan.ranks, talent.id).ranks })}
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      disabled={!remove.ok}
                      aria-label={remove.ok ? `Remove a point from ${talent.name}` : `Remove a point from ${talent.name}. ${remove.reason}`}
                      onClick={() => onChange({ ...plan, ranks: removePoint(plan.classId, plan.ranks, talent.id).ranks })}
                    >
                      Remove
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
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
