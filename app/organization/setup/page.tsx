"use client";
import { useState } from "react";
import { Building2, ArrowRight, ShieldCheck } from "lucide-react";
import { useAuth } from "../../../components/AuthProvider";

export default function OrganizationSetupPage(){
  const { signOut } = useAuth();
  const [name,setName]=useState("");
  const [message,setMessage]=useState("");
  return <main className="setup-page">
    <section className="setup-card card">
      <div className="setup-icon"><Building2 size={28}/></div>
      <div className="eyebrow">FIRST-TIME SETUP</div>
      <h1>Set up your organization</h1>
      <p>Your account is authenticated, but it is not assigned to an organization yet. PH-PMS keeps tenant context server-controlled and will not invent an organization ID.</p>
      <label>Organization Name<div className="input-wrap"><Building2 size={15}/><input value={name} onChange={e=>{setName(e.target.value);setMessage("")}} placeholder="PehalHealthcare Technologies"/></div></label>
      {message&&<div className="auth-error">{message}</div>}
      <button className="auth-primary" disabled={!name.trim()} onClick={()=>setMessage("Organization creation is ready for the backend bootstrap endpoint. Connect the Organization Master create API before enabling this action in production.")}>Continue <ArrowRight size={16}/></button>
      <button className="back-btn" onClick={()=>void signOut()}>Sign out</button>
      <div className="setup-security"><ShieldCheck size={16}/><span>Tenant isolation is enforced before organization-scoped modules are opened.</span></div>
    </section>
  </main>;
}
