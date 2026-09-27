// Shared player-pose contract (2026-09-17). The rescue mode and the driveable
// speedboat / jetski are built in parallel; both read the player through this
// ONE function instead of reaching into a particular craft's internals.
//
// World frame: the sim's own (metres). Coast/scene coordinates are
// world + (COAST.startX, COAST.startZ) = world + (230, 300) - see coast.js.
// heading: radians, the sim's convention (x += cos(h) * ds, z += sin(h) * ds).
// speed: m/s along the heading.
//
// A craft other than the eFoil registers a provider with setPoseProvider();
// with none registered the eFoil sim is read, so default behaviour is unchanged.

let provider = null;

export function setPoseProvider(fn) { provider = fn; }

export function playerPose(sim) {
  if (provider) return provider();
  return {
    x: sim.world.x,
    z: sim.world.z,
    heading: sim.world.heading,
    speed: sim.plant.state.speed,
    craft: 'efoil',
  };
}
