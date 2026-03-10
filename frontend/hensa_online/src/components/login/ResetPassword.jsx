import { useState } from "react";

export default function ResetPassword(){

  const [email,setEmail]=useState("");
  const [otp,setOtp]=useState("");
  const [password,setPassword]=useState("");
  const [message,setMessage]=useState("");

  const handleSubmit = async(e)=>{
    e.preventDefault();

    const res = await fetch(
      "http://localhost:5000/api/auth/reset-password",
      {
        method:"POST",
        headers:{ "Content-Type":"application/json"},
        body:JSON.stringify({email,otp,password})
      }
    );

    const data = await res.json();

    setMessage(data.message);

    redirect("/login");
  };

  return(

    <div className="min-h-screen flex items-center justify-center bg-gray-100">

      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">

        <h2 className="text-2xl font-bold text-center mb-6">
          Réinitialiser le mot de passe
        </h2>

        {message && (
          <div className="bg-green-100 p-3 rounded mb-4 text-sm">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e)=>setEmail(e.target.value)}
            className="w-full border p-3 rounded"
          />

          <input
            type="text"
            placeholder="Code OTP"
            value={otp}
            onChange={(e)=>setOtp(e.target.value)}
            className="w-full border p-3 rounded"
          />

          <input
            type="password"
            placeholder="Nouveau mot de passe"
            value={password}
            onChange={(e)=>setPassword(e.target.value)}
            className="w-full border p-3 rounded"
          />

          <button className="w-full py-3 bg-blue-600 text-white rounded">
            Réinitialiser
          </button>

        </form>

      </div>

    </div>

  )
}