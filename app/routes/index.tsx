import {
  MetaFunction,
  ActionFunction,
  redirect,
  LoaderFunction,
  json,
  Form,
  Link,
  useLoaderData,
} from "remix";
import { searchPlaces } from "~/src/meteoFrance";
import { searchHistory } from "~/src/cookies";
import { Place } from "~/src/types";

type LoaderData = { searchHistory: Place[] };

export const loader: LoaderFunction = async ({ request }) => {
  const cookieHeader = request.headers.get("Cookie");
  const historyCookie = (await searchHistory.parse(cookieHeader)) || {
    history: [],
  };
  return json({ searchHistory: historyCookie.history });
};

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();

  const query = formData.get("query") as string;

  const { places } = await searchPlaces(query);
  const place = places[0];

  if (place === undefined) return redirect("/");

  const cookieHeader = request.headers.get("Cookie");
  const historyCookie = (await searchHistory.parse(cookieHeader)) || {
    history: [],
  };
  historyCookie.history = [...historyCookie.history, place];

  return redirect(`/${place.lat},${place.lon}`, {
    headers: {
      "Set-Cookie": await searchHistory.serialize(historyCookie),
    },
  });
};

export const meta: MetaFunction = () => {
  return {
    title: "Minimeteo",
  };
};

export default function Index() {
  const data = useLoaderData<LoaderData>();

  return (
    <div>
      <Form method="post">
        <p>
          <label>
            Search for a place
            <input type="text" name="query" />
          </label>
        </p>
      </Form>
      <ul>
        {data.searchHistory.map((place) => (
          <li>
            <Link to={`/${place.lat},${place.lon}`}>{place.name}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
