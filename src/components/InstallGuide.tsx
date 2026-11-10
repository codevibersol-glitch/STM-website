import { SectionHead } from './Sections';

const STEPS = [
  'Get STM-Setup.exe from the Telegram chat. This site does not host the file.',
  'Start the file. Windows may say it protected your PC. That warning is because the publisher is unsigned.',
  'Choose More info, then Run anyway.',
  'If Windows asks for permission, run the installer as administrator.',
  'On first launch, STM opens beside the game. Sign in with the account you made here, then choose the character plan.',
] as const;

export function InstallGuide() {
  return (
    <section id="install" className="section" aria-labelledby="install-title">
      <div className="wrap">
        <SectionHead
          id="install-title"
          eyebrow="Install"
          title="Install STM on Windows"
          intro="STM-Setup.exe is the companion for WoW Forever. The game addon still has to be in the game folder. The installer is the Windows app."
        />
        <ol className="install-steps">
          {STEPS.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <p className="planner-scope">
          The unsigned-publisher warning is Windows SmartScreen. STM is not signed by a public publisher. You decide whether to run it. The account risk of automating gameplay is in the questions.
        </p>
        <p>
          <a className="btn btn-ghost" href="/faq">
            Read the account risk
          </a>
        </p>
      </div>
    </section>
  );
}
