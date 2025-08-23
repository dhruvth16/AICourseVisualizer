"use client";

import axios from "axios";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

function LandingPage() {
  const [otp, setOtp] = useState("");
  const email = useSearchParams().get("email");
  const name = useSearchParams().get("name");

  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/verify-otp`,
        { email, name, otp }
      );
      if (res.status === 200) {
        localStorage.setItem("token", res.data.token);
        const secure =
          typeof window !== "undefined" &&
          window.location.protocol === "https:";
        document.cookie = `token=${encodeURIComponent(
          res?.data?.user?.token
        )}; Max-Age=${60 * 60 * 24 * 7}; Path=/; SameSite=Lax${
          secure ? "; Secure" : ""
        }`;
        router.push(`/prompt-lesson`);
      }
    } catch (error) {
      console.error("Error submitting form:", error);
    }
  };

  return (
    <div className="w-full h-screen flex items-center justify-center bg-gray-100">
      <form
        onSubmit={handleSubmit}
        className="bg-white px-6 py-3 rounded-lg shadow-md w-lg"
      >
        <h1 className="text-2xl bg-gradient-to-b from-blue-400 to-purple-500 bg-clip-text font-black tracking-tighter text-transparent mb-6 font-heading border-b border-gray-300 pb-3">
          AICourseVisualizer
        </h1>
        <div className="mb-4">
          <label htmlFor="otp">OTP</label>
          <input
            type="text"
            placeholder="Enter the OTP"
            className="border my-1 p-2 rounded w-full outline-none bg-gray-50"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
          />
        </div>
        <div>
          <button
            type="submit"
            className="bg-blue-400 text-white p-2 rounded mt-4 cursor-pointer hover:bg-blue-500 transition-colors duration-100 font-semibold"
          >
            Verify OTP
          </button>
        </div>
      </form>
    </div>
  );
}

export default LandingPage;
