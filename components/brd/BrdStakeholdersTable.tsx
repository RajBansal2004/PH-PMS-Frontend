import type { BrdStakeholder } from "../../lib/brd/types";

type Props = {
  items: BrdStakeholder[];
};

export default function BrdStakeholdersTable({ items }: Props) {
  if (!items.length) {
    return <p>No stakeholders have been assigned.</p>;
  }

  return (
    <div className="brd-table-wrap">
      <table className="brd-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Role / Designation</th>
            <th>Organization</th>
            <th>Responsibility</th>
            <th>Contact</th>
          </tr>
        </thead>

        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td><strong>{item.name}</strong></td>
              <td>{item.role}</td>
              <td>{item.organization}</td>
              <td>{item.responsibility}</td>
              <td>
                <a href={`mailto:${item.email}`}>
                  {item.email}
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}