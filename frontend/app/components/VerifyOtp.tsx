"use client";

import axios from "axios";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { playfair } from "../helper/fonts";
import Logo from "./Logo";

function VerifyOtp() {
  const [otp, setOtp] = useState("");
  const email = useSearchParams().get("email");
  const name = useSearchParams().get("name");
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/verify-otp`,
        { email, name, otp },
        { withCredentials: true }
      );
      if (res.status === 200) {
        const secure =
          typeof window !== "undefined" &&
          window.location.protocol === "https:";
        document.cookie = `token=${encodeURIComponent(
          res?.data?.user?.token
        )}; Max-Age=${60 * 60 * 24 * 7}; Path=/; SameSite=Lax${
          secure ? "; Secure" : ""
        }`;
        router.push(
          `/prompt-lesson?user_id=${encodeURIComponent(
            res.data.user.id
          )}&token=${encodeURIComponent(
            res.data.user.token
          )}&name=${encodeURIComponent(res.data.user.name)}`
        );
      }
    } catch (error) {
      console.error("Error submitting form:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-screen flex items-center justify-center bg-gray-100 p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white px-6 py-3 rounded-lg shadow-md w-lg"
      >
        <Logo />
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
            {loading ? "Verifying..." : "Verify OTP"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default VerifyOtp;
