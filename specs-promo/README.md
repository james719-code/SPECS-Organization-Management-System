# SPECS membership promotion

A 45-second, 1920 × 1080, 30 fps Remotion video for BSCS students. Uses the website's original SPECS logo, locally bundled Poppins, deep teal `#0d6b66`, slate, mint accents, dotted backgrounds, and portal-inspired cards. The video includes an original synthesized instrumental soundtrack, transition swells, chart chimes, and typing effects, with readable on-screen copy. Run `npm run soundtrack` to regenerate the local WAV asset.

The feature scenes use a metallic phone with browser chrome and portal screens, realistic payment and attendance records, a volunteer story editor, and student registration. Enlarged detail cards make the small-screen content readable. Chart values, student details, event schedules, and payment amounts are illustrative, not live records. Motion uses Remotion frames for reproducible exports.

## Preview and export

From `specs-promo`:

```sh
npm install
npm start
npm run typecheck
npm run render
```

On Windows PowerShell, use `npm.cmd` if script execution is disabled. The MP4 is written to `out/specs-membership.mp4`. `npm run still` exports the closing invitation as `out/preview.png`.

The `signupUrl` composition prop defaults to the website's canonical domain and existing signup route, `specs-portal.org/signup`. It can be edited in `src/index.tsx` or overridden in Remotion Studio. Assets and fonts are local so rendering does not depend on a font service.

## Scene order

| Time | Message |
| --- | --- |
| 0–6s | SPECS letters assemble, gradient finish, orbital logo and community introduction |
| 6–14s | Discover events and activities |
| 14–21s | Review attendance and participation |
| 21–28s | Check dues and payment history |
| 28–35s | Student volunteers submit stories for review |
| 35–41s | Create an account; signup URL, PSU email, student ID |
| 41–45s | SPECS letters assemble again; final signup URL hold |

Feature illustrations use sample records and clearly marked demo event details. Copy is based on the repository's student routes, landing-page FAQ, and signup requirements. Story submission is qualified as a student volunteer feature. The invitation is to create a portal account: the FAQ already identifies enrolled CS students as organization members.

Remotion CLI reference: https://www.remotion.dev/docs/cli/render

The phone alternates right / left across the feature scenes, with mirrored text placement, varying camera zoom, directional entrances, and changing card positions. The latest export is `out/specs-membership-realistic.mp4`. The title designs live in `src/BrandTitles.tsx`: compact segmented lettering resolves into a mint gradient, with synchronized signature chimes. The opening pairs the word with an orbital SPECS emblem; the closing places the signup action and URL in a contrasting mint panel, visible early enough to hold for over two seconds.

Feature demos are in src/PortalScreen.tsx and the device/detail treatment is in src/RealisticDevice.tsx. Run npm run preview:scenes to render review frames for all five feature/registration scenes.
