import type { BrdScopeItem } from "../../lib/brd/types";

type Props = {
  items: BrdScopeItem[];
};

export default function BrdScopeCard({ items }: Props) {
  const included = items.filter((item) => item.included);
  const excluded = items.filter((item) => !item.included);

  function renderList(list: BrdScopeItem[]) {
    if (!list.length) {
      return <p>No scope items have been defined.</p>;
    }

    return (
      <ul className="brd-bullet-list">
        {list.map((item) => (
          <li key={item.id}>
            <strong>{item.title}</strong>
            {item.description && <p>{item.description}</p>}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <section className="brd-card">
      <h2 className="brd-card-title">4. Scope Summary</h2>
      <div className="brd-card-body">
        <h3 className="brd-scope-label in-scope">In Scope</h3>
        {renderList(included)}

        <div className="brd-out-scope">
          <h3 className="brd-scope-label out-scope">Out of Scope</h3>
          {renderList(excluded)}
        </div>
      </div>
    </section>
  );
}