import type { ComponentType } from 'react';
import { HOW_COPY, LOOP, MODELS, UNDER_THE_HOOD, type ModelId } from '../data/how';
import { DangerMapDemo } from '../demos/DangerMapDemo';
import { DashboardDemo } from '../demos/DashboardDemo';
import { PlannerDemo } from '../demos/PlannerDemo';
import { PostMortemDemo } from '../demos/PostMortemDemo';
import { ScorerDemo } from '../demos/ScorerDemo';
import { TelegramDemo } from '../demos/TelegramDemo';
import { Icon } from './Icon';
import { SectionHead } from './Sections';

const DEMOS: Record<ModelId, ComponentType> = {
  planner: PlannerDemo,
  scorer: ScorerDemo,
  map: DangerMapDemo,
  dashboard: DashboardDemo,
  postmortem: PostMortemDemo,
  telegram: TelegramDemo,
};

/** The loop, then one block per part of it, each with its working model, then the rules under the hood. */
export function HowItWorks() {
  return (
    <section id="how-it-works" className="section" aria-labelledby="how-it-works-title">
      <div className="wrap">
        <SectionHead id="how-it-works-title" eyebrow={HOW_COPY.eyebrow} title={HOW_COPY.title} intro={HOW_COPY.intro} />

        <ol className="loop" aria-label={HOW_COPY.loopLabel}>
          {LOOP.map((step) => (
            <li key={step.id} className="loop-step" data-reveal>
              <span className="card-icon">
                <Icon name={step.icon} />
              </span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>

        <div className="models">
          {MODELS.map((model, i) => {
            const Demo = DEMOS[model.id];
            return (
              <article key={model.id} id={`model-${model.id}`} className={i % 2 === 1 ? 'model model-flip' : 'model'} aria-labelledby={`model-${model.id}-title`}>
                <div className="model-text" data-reveal>
                  <p className="model-kicker">{model.kicker}</p>
                  <h3 id={`model-${model.id}-title`}>{model.title}</h3>
                  <p className="model-body">{model.body}</p>
                  <ul className="model-points">
                    {model.points.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </div>
                <div className="model-demo">
                  <Demo />
                </div>
              </article>
            );
          })}
        </div>

        <div className="hood" data-reveal>
          <h3>{HOW_COPY.hoodTitle}</h3>
          <p className="hood-intro">{HOW_COPY.hoodIntro}</p>
          <dl className="hood-list">
            {UNDER_THE_HOOD.map((item) => (
              <div key={item.title}>
                <dt>{item.title}</dt>
                <dd>{item.text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
