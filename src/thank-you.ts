window.addEventListener("load", async () => {
  const tokenObj: TokenObj | null = JSON.parse(
    localStorage.getItem("token") || "null"
  );

  try {
    const member = await window.MemberStack.onReady;

    if (member.loggedIn) {
      if (tokenObj)
        window.location.href = `https://tweetnest.io/member/${member.id}`;
      else {
        // getting auth url
        const req = await fetch(
          "https://api.tweetnest.io/apiV1/auth/authorize"
        );

        type AuthUrlResponse = {
          status: boolean;
          message?: string;
          data?: string;
        };
        const resp = (await req.json()) as AuthUrlResponse;
        if (resp.status) {
          window.location.href = resp.data;
        } else {
          throw new Error(resp.message);
        }
      }
    }
  } catch (error) {
    console.error(error);
  }
});
