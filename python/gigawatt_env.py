"""Gymnasium-style client for the GIGAWATT engine (headless Node sidecar, JSON lines).

    from gigawatt_env import GigawattEnv
    env = GigawattEnv()                       # spawns `node godot/sidecar/bridge.mjs`
    obs, info = env.reset(seed=1, scenario="lean")
    obs, reward, done, truncated, info = env.step({"name": "acceptContract", "args": ["trn-1-0-1234"]})
    env.legal_actions()                       # probed-valid actions with descriptions
    env.text()                                # compact plain-text state for LLM agents
    env.hash()                                # state digest, for determinism checks
Reward = change in net worth ($M) per `nextMonth`, -0.01 per rejected action, -10 on bankruptcy.
Episode ends on bankruptcy (done) or at the scenario horizon (truncated). One process = one game; run several for parallel rollouts.
"""
import json, os, subprocess

class GigawattEnv:
    def __init__(self, bridge=None, node="node"):
        path = bridge or os.path.join(os.path.dirname(__file__), "..", "godot", "sidecar", "bridge.mjs")
        self.p = subprocess.Popen([node, path], stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True, bufsize=1)
        self._id = 0

    def _call(self, fn, name=None, args=None):
        self._id += 1
        self.p.stdin.write(json.dumps({"id": self._id, "fn": fn, "name": name, "args": args or []}) + "\n"); self.p.stdin.flush()
        while True:
            r = json.loads(self.p.stdout.readline())
            if r.get("id") == self._id:
                if not r.get("ok"): raise RuntimeError(r.get("error"))
                return r["result"]

    def scenarios(self): return self._call("env", "scenarios")
    def reset(self, seed=None, scenario=None, mode=None):
        return self._call("env", "reset", [{"seed": seed, "scenario": scenario, "mode": mode}]), {}
    def step(self, action):
        r = self._call("env", "step", [action]); return r["obs"], r["reward"], r["done"], r["truncated"], r["info"]
    def obs(self): return self._call("env", "obs")
    def text(self): return self._call("env", "text")
    def legal_actions(self, full=False): return self._call("env", "actions", [{"full": full}])
    def hash(self): return self._call("env", "hash")
    def query(self, name, *args): return self._call("q", name, list(args))
    def close(self): self.p.terminate()

if __name__ == "__main__":  # smoke: random-legal-action agent for one year
    import random
    env = GigawattEnv(); obs, _ = env.reset(seed=1, scenario="classic"); total = 0.0
    for m in range(12):
        acts = env.legal_actions(); a = random.choice([x for x in acts if x["name"] != "nextMonth"] or acts)
        env.step({"name": a["name"], "args": a.get("args")}); obs, r, done, trunc, info = env.step({"name": "nextMonth"}); total += r
        print(m, f"cash={obs['cash']:,.0f} nw={obs['netWorth']:,.0f} r={r:+.3f}")
    print("hash", env.hash()); env.close()
