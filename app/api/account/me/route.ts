import { getAccountContext } from "../../../account/account-data";

export async function GET() {
  const { user, company } = await getAccountContext();
  if (!user) {
    return Response.json(
      { authenticated: false, user: null, company: null },
      { status: 401 }
    );
  }

  return Response.json({
    authenticated: true,
    user: {
      id: user.id,
      email: user.email,
    },
    company,
  });
}
