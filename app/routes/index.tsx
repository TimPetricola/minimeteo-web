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
import { getRecentPlaces, setRecentPlaces } from "~/src/cookies";
import { Place } from "~/src/types";

type LoaderData = { recentPlaces: Place[] };

export const loader: LoaderFunction = async ({ request }) => {
  const recentPlaces = await getRecentPlaces(request.headers.get("Cookie"));
  const data: LoaderData = { recentPlaces };

  return json(data);
};

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const query = formData.get("query");

  if (typeof query !== "string" || query.trim().length === 0)
    return redirect("/");

  const { places } = await searchPlaces(query);
  const place = places[0];

  if (place === undefined) return redirect("/");

  const recentPlaces = await getRecentPlaces(request.headers.get("Cookie"));

  // append most recent places and make them unique by name
  const updatedRecentPlaces = [
    ...[place, ...recentPlaces]
      .reduce((acc, place) => {
        acc.set(place.name, place);
        return acc;
      }, new Map<Place["name"], Place>())
      .values(),
  ]
    // keep 10 max
    .filter((place, index) => index < 10);

  return redirect(`/${place.lat},${place.lon}`, {
    headers: {
      "Set-Cookie": await setRecentPlaces(updatedRecentPlaces),
    },
  });
};

export const meta: MetaFunction = () => {
  return {
    title: "Minimeteo",
  };
};

export default function Index() {
  const { recentPlaces } = useLoaderData<LoaderData>();

  return (
    <>
      <header className="py-8">
        <h1 className="text-4xl font-bold">
          <Link to="/">Minimeteo</Link>
        </h1>
      </header>
      <main>
        <section className="py-12">
          <Form method="post">
            <label className="block">
              <span className="text-gray-700">Search for a place</span>
              <input
                name="query"
                type="search"
                className="mt-1 block w-full"
                placeholder=""
              />
            </label>
          </Form>
        </section>

        {recentPlaces.length > 0 && (
          <section className="py-12">
            <h2 className="text-2xl font-bold mb-4">Recent places</h2>
            <ul>
              {recentPlaces.map((place, index) => (
                <li key={place.name} className={`opacity-${100 - index * 10}`}>
                  <Link to={`/${place.lat},${place.lon}`}>{place.name}</Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </>
  );
}
