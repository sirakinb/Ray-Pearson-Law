export const officeAddressLines = [
	'730 Peachtree St NE',
	'Ste. 570',
	'Atlanta, Georgia 30308',
] as const;

export const officeAddressFull = officeAddressLines.join(', ');

export const officeMapsQuery = encodeURIComponent(
	'730 Peachtree St NE Ste 570 Atlanta GA 30308',
);

export const officeMapsUrl = `https://www.google.com/maps/search/?api=1&query=${officeMapsQuery}`;

export const officeMapsEmbedUrl = `https://maps.google.com/maps?q=${officeMapsQuery}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
