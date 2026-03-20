# Provider Integration Guide

## Steps

1. Provision a project key in the platform.
2. Add the SDK package to the provider web app.
3. Initialize the tracker at app boot.
4. Identify users with a pseudonymous service identifier.
5. Track service events at meaningful care journey points.
6. Avoid sensitive free-text and direct identifying data in event properties.

## Recommended mapping

- Landing page load -> `landing_viewed`
- Screening flow open -> `screening_started`
- Screening result -> `screening_completed`
- Intervention card start -> `intervention_started`
- Referral handoff -> `referral_started`
- Booked appointment -> `appointment_booked`

## What not to send

- Names, email addresses, phone numbers
- Session transcripts
- Free-text symptom notes
- Government identifiers
