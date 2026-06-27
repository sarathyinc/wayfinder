import Link from "next/link";

export default function Inbox() {
  return (
    <div>
      <h1>Inbox</h1>
      <p>New donor offers here.</p>
      <Link href="/donors">Go to Donor Records</Link>
      <br />
      <button>Create Donor from Offer</button>
    </div>
  );
}
