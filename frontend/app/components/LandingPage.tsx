"use client";

import axios from "axios";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Logo from "./Logo";

function LandingPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/initiate-signin`,
        { email, name },
        { withCredentials: true }
      );
      if (res.status === 200) {
        router.push(
          `/verify-otp?email=${encodeURIComponent(
            email
          )}&name=${encodeURIComponent(name)}`
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
        className="bg-white px-6 py-3 rounded-lg shadow-md w-xl"
      >
        <Logo />
        <div className="mb-4">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            placeholder="Enter your email"
            className="border my-1 p-2 rounded w-full outline-none bg-gray-50"
            value={email.trim()}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="name">Name</label>
          <input
            type="text"
            placeholder="Enter your name"
            className="border my-1 p-2 rounded w-full outline-none bg-gray-50"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="flex items-center justify-center w-full">
          <button
            type="submit"
            className="bg-blue-400 text-white p-2 rounded mt-4 cursor-pointer hover:bg-blue-500 transition-colors duration-100 font-semibold"
          >
            {loading ? "Sending..." : "Send OTP"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default LandingPage;
