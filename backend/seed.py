import argparse
import sys
from app.database import engine, SessionLocal, Base
from app.models import Child, Activity, Observation, Attendance, ActivityLog
from app.services import recalculate_child_scores
from seed_data import ACTIVITIES, SEED_CHILDREN, SEED_OBSERVATIONS, DOMAINS, days_ago, seed_attendance

def run_seed(reset: bool = False):
    if reset:
        print("Dropping existing tables...")
        Base.metadata.drop_all(bind=engine)

    print("Creating tables if they do not exist...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        existing_children = db.query(Child).count()
        if existing_children > 0 and not reset:
            print(f"Database already contains {existing_children} children. Use --reset to re-seed.")
            return

        print("Seeding activities (11)...")
        for act in ACTIVITIES:
            db.add(Activity(
                id=act["id"],
                name=act["name"],
                domain=act["domain"],
                difficulty=act["difficulty"],
                minutes=act["minutes"],
                emoji=act["emoji"],
                skills=act["skills"],
                steps=act["steps"],
                for_level=act["for_level"],
            ))
        db.flush()

        print("Seeding children (9)...")
        for ch in SEED_CHILDREN:
            db.add(Child(
                id=ch["id"],
                name=ch["name"],
                age=ch["age"],
                avatar=ch["avatar"],
                tone=ch["tone"],
                scores=ch["scores"],
                strengths=ch["strengths"],
                needs=ch["needs"],
            ))
        db.flush()

        # Domain to default activity map for baseline observations
        domain_default_activity = {}
        for d in DOMAINS:
            for act in ACTIVITIES:
                if act["domain"] == d:
                    domain_default_activity[d] = act["id"]
                    break

        print("Seeding baseline observations (45 = 9 children × 5 domains, is_baseline=True)...")
        for ch in SEED_CHILDREN:
            for d in DOMAINS:
                db.add(Observation(
                    id=f"base-{ch['id']}-{d}",
                    child_id=ch["id"],
                    domain=d,
                    activity_id=domain_default_activity[d],
                    score=ch["scores"][d],
                    note="Baseline",
                    date=days_ago(14),
                    is_baseline=True,
                ))
        db.flush()

        print("Seeding specific observations (6, is_baseline=False)...")
        for obs in SEED_OBSERVATIONS:
            db.add(Observation(
                id=obs["id"],
                child_id=obs["child_id"],
                domain=obs["domain"],
                activity_id=obs["activity_id"],
                score=obs["score"],
                note=obs["note"],
                date=obs["date"],
                is_baseline=False,
            ))
        db.flush()

        print("Seeding attendance records...")
        attendance_records = seed_attendance(SEED_CHILDREN)
        for att in attendance_records:
            db.add(Attendance(
                child_id=att["child_id"],
                date=att["date"],
                present=att["present"],
            ))

        db.commit()

        # Score derivation verification using the shared recalculate_child_scores service
        print("\nVerifying score derivation against SEED_CHILDREN...")
        all_children = db.query(Child).all()
        mismatch_count = 0
        for child in all_children:
            recalculate_child_scores(child, db)
            orig_child = next(c for c in SEED_CHILDREN if c["id"] == child.id)
            if child.scores != orig_child["scores"]:
                mismatch_count += 1
                print(f"  [MISMATCH] Child {child.name} ({child.id}):")
                print(f"    Expected: {orig_child['scores']}")
                print(f"    Derived:  {child.scores}")

        if mismatch_count == 0:
            print("  ✓ All 9 children's derived scores match SEED_CHILDREN perfectly.")
        else:
            print(f"  ⚠ {mismatch_count} children had score derivation mismatches.")

        c_count = db.query(Child).count()
        act_count = db.query(Activity).count()
        obs_total = db.query(Observation).count()
        obs_baseline = db.query(Observation).filter(Observation.is_baseline == True).count()
        obs_specific = db.query(Observation).filter(Observation.is_baseline == False).count()
        att_count = db.query(Attendance).count()

        print("\nSeed completed successfully!")
        print(f"  • Children: {c_count}")
        print(f"  • Activities: {act_count}")
        print(f"  • Observations: {obs_total} ({obs_baseline} baseline + {obs_specific} specific)")
        print(f"  • Attendance records: {att_count}")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}", file=sys.stderr)
        raise
    finally:
        db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed VikasSetu SQLite database.")
    parser.add_argument("--reset", action="store_true", help="Drop and recreate all tables before seeding.")
    args = parser.parse_args()
    run_seed(reset=args.reset)
