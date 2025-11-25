
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });
      console.log("[OAuth] Session token created");

      const cookieOptions = getSessionCookieOptions(req);
      console.log("[OAuth] Cookie options:", JSON.stringify({
        ...cookieOptions,
        hostname: req.hostname,
        protocol: req.protocol,
        headers: {
          host: req.headers.host,
          'x-forwarded-proto': req.headers['x-forwarded-proto'],
          'x-forwarded-host': req.headers['x-forwarded-host'],
        }
      }, null, 2));
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      console.log("[OAuth] Cookie set:", COOKIE_NAME, "with maxAge:", ONE_YEAR_MS);
      console.log("[OAuth] Cookie set, redirecting to /");

      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}
