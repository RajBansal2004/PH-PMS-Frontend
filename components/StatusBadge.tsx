export function StatusBadge({children,tone="blue"}:{children:React.ReactNode;tone?:string}){return <span className={`status ${tone}`}>{children}</span>}
