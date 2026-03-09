import { useState } from "react";

export default function ForgotPassword(){

  const [email,setEmail]=useState("");
  const [message,setMessage]=useState("");

  const handleSubmit = async(e)=>{
    e.preventDefault();

    const res = await fetch(
      "http://localhost:5000/api/auth/forgot-password",
      {
        method:"POST",
        headers:{ "Content-Type":"application/json"},
        body:JSON.stringify({email})
      }
    );

    const data = await res.json();

    setMessage(data.message);
  };

  return(

    <div className="min-h-screen flex items-center justify-center bg-gray-100">

      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">

        <h2 className="text-2xl font-bold text-center mb-6">
          Mot de passe oublié
        </h2>

        {message && (
          <div className="bg-green-100 p-3 rounded mb-4 text-sm">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">

          <input
            type="email"
            placeholder="Votre email"
            value={email}
            onChange={(e)=>setEmail(e.target.value)}
            className="w-full border p-3 rounded"
            required
          />

          <button className="w-full py-3 bg-blue-600 text-white rounded">
            Envoyer le code
          </button>

        </form>

      </div>

    </div>
  )
}