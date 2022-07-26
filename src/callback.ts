var MemberStack: IMemberStack =
  (window.MemberStack as IMemberStack) || ({} as IMemberStack);

window.addEventListener("load", async () => {
  try {
    const sp = new URLSearchParams(window.location.search);
    const oauth_token = sp.get("oauth_token");
    const oauth_verifier = sp.get("oauth_verifier");

    let member = await MemberStack.onReady;
    if (member.loggedIn && oauth_token && oauth_verifier) {
      const mid = member.id;

      const req = await fetch("https://api.tweetnest.io/apiV1/auth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          oauth_token,
          oauth_verifier,
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
      } else throw new Error(resp.message);
    }
  } catch (error) {
    alert(error.message);
    console.error(error);
  }
});
