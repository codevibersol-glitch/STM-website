/** Decorative embers. Hidden from assistive tech, and removed when motion is reduced. */
export function Embers() {
  return (
    <div className="embers" aria-hidden="true">
      {Array.from({ length: 8 }, (_, index) => (
        <span key={index} className={`ember ember-${index + 1}`} />
      ))}
    </div>
  );
}
