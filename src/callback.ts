var MemberStack: IMemberStack =
  (window.MemberStack as IMemberStack) || ({} as IMemberStack);

window.addEventListener("load", async () => {
  try {
    const sp = new URLSearchParams(window.location.search);
    const code = sp.get("code");
    const state = sp.get("state");

    const member = await MemberStack.onReady;
    if (member.loggedIn && state && code) {
      const mid = member.id;

      const req = await fetch("https://api.tweetnest.io/api/auth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          state,
          code,
          mid,
        }),
      });

      type TokenUrlResponse = {
        status: boolean;
        message?: string;
        data?: TokenObj;
      };
      const resp: TokenUrlResponse = (await req.json()) as TokenUrlResponse;

      if (resp.status) {
        localStorage.setItem("token", JSON.stringify(resp.data));
        window.location.href = `https://tweetnest.io/member/${mid}`;
      } else throw new Error();
    }
  } catch (error) {
    console.error(error);
  }
});
