"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Check, ChevronDown, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, Smartphone, Timer, AlertTriangle, CheckCircle2, XCircle, KeyRound } from "lucide-react";
import { ApiError } from "../lib/api";
import { useAuth } from "./AuthProvider";
function Logo(){return <div className="auth-logo"><div className="brand-mark"><span>✣</span></div><b>Pehal<br/>Healthcare<br/>Technologies</b></div>}
function AuthLayout({children,title="Welcome Back!",sub="Please sign in to continue to your account."}:{children:React.ReactNode;title?:string;sub?:string}){return <div className="auth-page"><div className="auth-showcase"><Logo/><div className="showcase-copy"><h1>One Platform.<br/>Complete Project<br/>Excellence.</h1><p>Plan. Track. Collaborate. Deliver.</p></div><div className="showcase-art"><div className="screen-card">▦<br/><small>Projects</small></div><div className="screen-card second">◫<br/><small>Analytics</small></div><div className="screen-card third">◉<br/><small>Delivery</small></div></div><div className="trusted">Trusted by teams to deliver successful<br/>projects, every time.</div></div><div className="auth-panel"><div className="auth-card"><div className="lang">EN <ChevronDown size={12}/></div><Logo/><h2>{title}</h2><p className="auth-sub">{sub}</p>{children}<footer>Privacy Policy &nbsp; • &nbsp; Terms of Use &nbsp; • &nbsp; Support<br/><span>© 2025 Pehal Healthcare Technologies. All rights reserved.</span></footer></div></div></div>}
export function LoginScreen(){
 const { signIn, signingIn, user } = useAuth();
 const [email,setEmail]=useState("");
 const [pass,setPass]=useState("");
 const [remember,setRemember]=useState(false);
 const [show,setShow]=useState(false);
 const [error,setError]=useState("");
 const [fieldError,setFieldError]=useState("");
 const submit=async(e:React.FormEvent)=>{
  e.preventDefault(); setError(""); setFieldError("");
  const normalized=email.trim().toLowerCase();
  if(!normalized){setFieldError("Please enter your work email.");return;}
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)){setFieldError("Please enter a valid work email address.");return;}
  if(!pass){setError("Please enter your password.");return;}
  try{
   const u=await signIn(normalized,pass,remember);
   const params=new URLSearchParams(window.location.search);
   const next=params.get("next");
   if(u.organizationId) window.location.replace(next || "/dashboard");
   else window.location.replace("/organization/setup");
  }catch(err:any){
   const status=err instanceof ApiError ? err.status : 0;
   if(status===401) setError("Invalid email or password. Please try again.");
   else if(status===423) setError("Your account is temporarily locked. Please try again later or contact your administrator.");
   else if(status===403) setError(err.message || "Your account does not have access to PH-PMS.");
   else setError(err.message || "Unable to sign in. Please try again.");
  }
 };
 if(user) return null;
 return <AuthLayout><form className="auth-form" onSubmit={submit} noValidate>
  <label>Work Email <b>*</b><div className={`input-wrap ${fieldError?"has-error":""}`}><Mail size={15}/><input autoComplete="username" inputMode="email" value={email} onChange={e=>{setEmail(e.target.value);setFieldError("")}} placeholder="Enter your work email" aria-invalid={!!fieldError}/></div>{fieldError&&<small className="field-error">{fieldError}</small>}</label>
  <label>Password <b>*</b><div className="input-wrap"><LockKeyhole size={15}/><input autoComplete="current-password" type={show?"text":"password"} value={pass} onChange={e=>setPass(e.target.value)} placeholder="Enter your password"/><button type="button" aria-label={show?"Hide password":"Show password"} onClick={()=>setShow(v=>!v)}>{show?<EyeOff size={15}/>:<Eye size={15}/>}</button></div></label>
  <div className="auth-row"><label className="check"><input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)}/> Remember Me</label><Link href="/auth/forgot-password">Forgot Password?</Link></div>
  <div className="captcha" role="status" aria-label="Security verification"><span>□</span><div><b>I'm not a robot</b><small>Security verification is applied when required</small></div><span className="captcha-mark">↻</span></div>
  {error&&<div className="auth-error" role="alert">{error}</div>}
  <button className="auth-primary" disabled={signingIn}>{signingIn?<><span className="button-spinner"/>Signing in…</>:<>Sign In<ArrowRight size={17}/></>}</button>
  <div className="or">or continue with</div>
  <button type="button" className="sso" disabled><span>G</span><span>Sign in with Google</span><small>Coming soon</small></button>
  <button type="button" className="sso" disabled><span className="ms-square">▦</span><span>Sign in with Microsoft</span><small>Coming soon</small></button>
 </form></AuthLayout>
}
export function MfaScreen(){return <AuthLayout title="Verify Your Identity" sub="We sent a 6-digit verification code to mayank.swaroop@pehalhealthcare.com."><div className="method-tabs"><button className="selected">A. Email OTP</button><button>B. Authenticator</button><button>C. SMS OTP</button><button>D. Push</button></div><div className="otp-brand"><ShieldCheck size={24}/><b>Secure Authentication</b></div><h3 className="center">Enter verification code</h3><p className="center muted">Code expires in <b>02:45</b></p><div className="otp-inputs">{[1,2,4,6,7,9].map((x,i)=><input key={i} defaultValue={x}/>)}</div><label className="check center-check"><input type="checkbox"/> Remember this device for 30 days</label><button className="auth-primary">Verify & Continue <ArrowRight size={16}/></button><button className="text-btn">Resend Code (00:25)</button><button className="text-btn">Use another method</button></AuthLayout>}
export function ForgotScreen(){return <AuthLayout title="Forgot Password?" sub="No worries! Enter your registered email address and we'll send you a link to reset your password."><form className="auth-form"><label>Work Email <b>*</b><div className="input-wrap"><Mail size={15}/><input placeholder="Enter your work email"/></div></label><button className="auth-primary">Send Reset Link <ArrowRight size={16}/></button><div className="or">or</div><Link className="back-btn" href="/login">← Back to Login</Link><div className="helper">Remember your password? <Link href="/login">Sign in</Link> &nbsp; Need help? <b>Contact Support</b></div></form></AuthLayout>}
export function ResetScreen({expired=false}:{expired?:boolean}){return <AuthLayout title={expired?"Password Expired":"Create New Password"} sub={expired?"Your password has expired. Please set a new one to continue.":"Enter your new password below."}><form className="auth-form">{expired&&<div className="expired-icon"><Timer size={32}/></div>}{expired&&<label>Current Password <b>*</b><div className="input-wrap"><LockKeyhole size={15}/><input type="password" placeholder="Enter current password"/></div></label>}<label>New Password <b>*</b><div className="input-wrap"><LockKeyhole size={15}/><input type="password" placeholder="Enter new password"/></div></label><label>Confirm New Password <b>*</b><div className="input-wrap"><LockKeyhole size={15}/><input type="password" placeholder="Confirm new password"/></div></label><div className="strength"><span>Password Strength</span><i/><i/><i/><i/><b>Medium</b></div><ul className="rules"><li><Check size={12}/>At least 8 characters</li><li><Check size={12}/>At least 1 uppercase letter</li><li><Check size={12}/>At least 1 lowercase letter</li><li><Check size={12}/>At least 1 number</li><li><Check size={12}/>At least 1 special character</li></ul><button className="auth-primary">{expired?"Update Password":"Reset Password"}<ArrowRight size={16}/></button><Link className="back-btn" href="/login">← Back to Login</Link></form></AuthLayout>}
export function SessionsScreen(){return <div className="security-page"><div className="security-top"><Logo/><Link href="/dashboard">← Back to Dashboard</Link></div><div className="security-shell"><div className="security-title"><div><div className="eyebrow">AUTHENTICATION & SECURITY</div><h1>Session / Device Management</h1><p>Manage your active sessions and trusted devices</p></div><ShieldCheck size={30}/></div><div className="security-cards"><div className="card current"><span>✓</span><b>This Device (Current Session)</b><p>Windows 11 · Chrome 124.0.6367.91</p><small>New Delhi, India · Last active: Just now</small><StatusMini text="Trusted Device"/></div><div className="card account"><b>Account Summary</b><div><strong>3</strong><span>Active Sessions</span></div><div><strong>2</strong><span>Trusted Devices</span></div><div><strong>12</strong><span>Login History</span></div></div></div><div className="card security-table"><div className="section-head"><b>Active Sessions</b><button className="btn outline">↻ Refresh</button></div><table><thead><tr><th>Device / Browser</th><th>Location</th><th>IP Address</th><th>Last Active</th><th>Status</th><th>Actions</th></tr></thead><tbody>{[["MacOS 14.4 · Safari 17.4","Bengaluru, Karnataka, India","203.0.113.25","10 mins ago","Active"],["Android 14 · Chrome Mobile 124.0","Mumbai, Maharashtra, India","103.21.44.55","2 hours ago","Active"],["Windows 10 · Edge 124.0","Kolkata, West Bengal, India","115.187.90.12","1 day ago","Idle"]].map(x=><tr key={x[0]}>{x.map((c,i)=><td key={i}>{i===4?<StatusMini text={c}/>:c}</td>)}<td><button className="btn outline">Logout</button></td></tr>)}</tbody></table><div className="trusted-devices"><h3>Trusted Devices</h3><div className="device-row"><span>◉</span><b>iPhone 15 · iOS 17.4</b><small>First used 01 May 2025 · Last used 3 days ago</small><button className="toggle on"/></div><div className="device-row"><span>▣</span><b>Dell XPS 13 · Windows 11</b><small>First used 20 Apr 2025 · Last used 6 days ago</small><button className="toggle"/></div></div><button className="danger-btn">Logout from all other sessions</button></div></div></div>}
function StatusMini({text}:{text:string}){return <span className={`status ${text==="Idle"?"amber":"green"}`}>{text}</span>}
export function AccessDenied(){return <AuthLayout title="Access Denied" sub="You don't have permission to access this resource."><div className="access-icon"><ShieldCheck size={52}/></div><div className="access-box"><b>What can you do?</b><p>• Contact your administrator.<br/>• Check if you have the right role.<br/>• Go back and try again.</p></div><Link className="auth-primary centered" href="/dashboard">⌂ Go to Dashboard</Link><Link className="back-btn" href="/dashboard">← Go Back</Link></AuthLayout>}
