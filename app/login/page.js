"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,20}$/;

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [username, setUsername] = useState("");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);

    try {
      if (mode === "signup") {
        const uname = username.trim();
        const nick = nickname.trim();

        if (!USERNAME_PATTERN.test(uname)) {
          setError("아이디는 영문/숫자/밑줄(_)로 3~20자여야 해요.");
          setLoading(false);
          return;
        }
        if (!nick) {
          setError("닉네임을 입력해주세요.");
          setLoading(false);
          return;
        }

        const { data: existing } = await supabase
          .from("profiles")
          .select("id")
          .eq("username", uname)
          .maybeSingle();
        if (existing) {
          setError("이미 사용 중인 아이디예요.");
          setLoading(false);
          return;
        }

        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { username: uname, nickname: nick } },
        });
        if (signUpError) throw signUpError;
        setInfo(
          "가입이 완료됐어요. 이메일 인증이 켜져 있다면 받은 편지함을 확인한 뒤 아이디로 로그인해주세요."
        );
        setMode("login");
      } else {
        const uname = username.trim();
        const { data: resolvedEmail, error: lookupError } = await supabase.rpc(
          "get_email_for_username",
          { uname }
        );
        if (lookupError || !resolvedEmail) {
          setError("아이디를 찾을 수 없어요.");
          setLoading(false);
          return;
        }

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: resolvedEmail,
          password,
        });
        if (signInError) throw signInError;
        router.replace("/shelf");
      }
    } catch (err) {
      setError(err.message || "문제가 발생했어요. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl text-ink">나의 책장</h1>
          <p className="text-muted text-sm mt-2">
            읽은 책을 기록하고 정리하는 나만의 책장
          </p>
        </div>

        <div className="bg-card rounded-xl2 shadow-soft p-7">
          <div className="flex gap-2 mb-6 bg-rose-50 rounded-full p-1">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError("");
                setInfo("");
              }}
              className={`flex-1 py-2 rounded-full text-sm transition ${
                mode === "login"
                  ? "bg-rose-500 text-white font-medium"
                  : "text-muted"
              }`}
            >
              로그인
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setError("");
                setInfo("");
              }}
              className={`flex-1 py-2 rounded-full text-sm transition ${
                mode === "signup"
                  ? "bg-rose-500 text-white font-medium"
                  : "text-muted"
              }`}
            >
              회원가입
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-sm text-muted">
              아이디
              <input
                className="rounded-lg border border-rose-100 px-3 py-2.5 text-ink focus:border-rose-400"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="영문/숫자/밑줄, 3~20자"
                required
              />
            </label>

            {mode === "signup" && (
              <>
                <label className="flex flex-col gap-1.5 text-sm text-muted">
                  닉네임 (책장에 표시돼요)
                  <input
                    className="rounded-lg border border-rose-100 px-3 py-2.5 text-ink focus:border-rose-400"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="예: 유진"
                    required
                  />
                </label>

                <label className="flex flex-col gap-1.5 text-sm text-muted">
                  이메일
                  <input
                    type="email"
                    className="rounded-lg border border-rose-100 px-3 py-2.5 text-ink focus:border-rose-400"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </label>
              </>
            )}

            <label className="flex flex-col gap-1.5 text-sm text-muted">
              비밀번호
              <input
                type="password"
                className="rounded-lg border border-rose-100 px-3 py-2.5 text-ink focus:border-rose-400"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="6자 이상"
                minLength={6}
                required
              />
            </label>

            {error && <p className="text-sm text-rose-600">{error}</p>}
            {info && <p className="text-sm text-ink/70">{info}</p>}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white rounded-lg py-3 text-sm font-medium transition"
            >
              {loading
                ? "처리 중..."
                : mode === "signup"
                ? "회원가입"
                : "로그인"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
