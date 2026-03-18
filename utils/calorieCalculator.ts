export const calculateCalories = (
  met: number,
  weight: number,
  minutes: number
) => {

  const calories = (met * weight * 3.5 / 200) * minutes;

  return Math.round(calories);

};