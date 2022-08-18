var MemberStack = window.MemberStack || {};
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
            const resp = (await req.json());
            if (resp.status) {
                localStorage.setItem("token", JSON.stringify(resp.data));
                window.location.href = `https://tweetnest.io/member/${mid}`;
            }
            else
                throw new Error(resp.message);
        }
    }
    catch (error) {
        console.error(error);
    }
});
