"""
Melbourne Liveability Index - Data Exploration Dashboard
Built with Streamlit for real-time data visualization and analysis.
"""
import streamlit as st
import pandas as pd
import numpy as np
import plotly.graph_objects as go
import plotly.express as px
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from ingestion.base import get_db_connection
from ingestion.config import get_config
from models.monitoring import ScoreMonitor

# Set page config
st.set_page_config(
    page_title="Melbourne Liveability Dashboard",
    page_icon="🏙️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS
st.markdown("""
    <style>
        .metric-box { background-color: #f0f2f6; padding: 1rem; border-radius: 0.5rem; margin: 0.5rem 0; }
        .header { font-size: 2rem; font-weight: bold; color: #1f77b4; }
    </style>
""", unsafe_allow_html=True)


@st.cache_data
def load_data():
    """Load data from database with caching."""
    conn = get_db_connection()
    query = """
        SELECT
            s.id,
            s.name,
            cs.rate_per_100k,
            cs.offence_count,
            ts.stop_count,
            ts.nearest_train_km,
            ts.nearest_tram_km,
            ts.nearest_bus_km,
            ss.avg_icsea_score,
            ss.school_count,
            gs.green_pct_of_suburb,
            gs.park_count,
            gs.nearest_park_km,
            pp.median_house_price,
            ls.score_crime,
            ls.score_transport,
            ls.score_schools,
            ls.score_greenspace,
            ls.score_affordability,
            ls.score_total,
            ls.computed_at
        FROM suburbs s
        LEFT JOIN crime_stats cs ON cs.suburb_id = s.id
        LEFT JOIN transport_scores ts ON ts.suburb_id = s.id
        LEFT JOIN school_scores ss ON ss.suburb_id = s.id
        LEFT JOIN greenspace_scores gs ON gs.suburb_id = s.id
        LEFT JOIN property_prices pp ON pp.suburb_id = s.id
        LEFT JOIN liveability_scores ls ON ls.suburb_id = s.id
        ORDER BY ls.score_total DESC
    """
    df = pd.read_sql_query(query, conn)
    conn.close()
    return df


def main():
    """Main dashboard application."""

    # Header
    col1, col2 = st.columns([3, 1])
    with col1:
        st.markdown('<div class="header">🏙️ Melbourne Liveability Dashboard</div>', unsafe_allow_html=True)
    with col2:
        st.markdown("### Data Science Tools")

    st.markdown("---")

    # Load data
    with st.spinner("Loading data..."):
        df = load_data()

    if df.empty:
        st.error("No data available. Please run the ingestion pipeline first.")
        return

    # Sidebar filters
    st.sidebar.markdown("## Filters & Settings")
    config = get_config()
    current_weights = config.get_weights()

    # Score range slider
    min_score, max_score = st.sidebar.slider(
        "Filter by Liveability Score",
        float(df['score_total'].min()),
        float(df['score_total'].max()),
        (float(df['score_total'].quantile(0.25)), float(df['score_total'].quantile(0.75)))
    )
    filtered_df = df[(df['score_total'] >= min_score) & (df['score_total'] <= max_score)]

    # Metric selector
    metric_options = {
        'Safety (Crime Rate)': 'rate_per_100k',
        'Transport Access': 'stop_count',
        'School Quality': 'avg_icsea_score',
        'Green Space': 'green_pct_of_suburb',
        'Housing Affordability': 'median_house_price'
    }

    # Tabs for different views
    tab1, tab2, tab3, tab4, tab5 = st.tabs([
        "📊 Overview", "📈 Score Analysis", "🔍 Suburb Comparison",
        "📉 Metrics", "⚙️ System Health"
    ])

    # TAB 1: OVERVIEW
    with tab1:
        st.subheader("Liveability Index Summary")

        col1, col2, col3, col4 = st.columns(4)
        with col1:
            st.metric("Total Suburbs", len(filtered_df), f"{len(filtered_df)}/{len(df)}")
        with col2:
            st.metric("Mean Score", f"{filtered_df['score_total'].mean():.1f}", "out of 100")
        with col3:
            st.metric("Median Score", f"{filtered_df['score_total'].median():.1f}", "out of 100")
        with col4:
            st.metric("Score Std Dev", f"{filtered_df['score_total'].std():.1f}", "variation")

        col1, col2 = st.columns(2)

        with col1:
            # Score distribution
            fig = px.histogram(
                filtered_df,
                x='score_total',
                nbins=30,
                title='Distribution of Liveability Scores',
                labels={'score_total': 'Liveability Score'},
                color_discrete_sequence=['#1f77b4']
            )
            fig.add_vline(
                x=filtered_df['score_total'].mean(),
                line_dash="dash",
                line_color="red",
                annotation_text="Mean"
            )
            st.plotly_chart(fig, use_container_width=True)

        with col2:
            # Top 10 suburbs
            st.markdown("### Top 10 Most Liveable Suburbs")
            top_10 = filtered_df.nlargest(10, 'score_total')[['name', 'score_total']]
            top_10_display = top_10.reset_index(drop=True)
            top_10_display.index = top_10_display.index + 1
            st.dataframe(top_10_display, use_container_width=True)

    # TAB 2: SCORE BREAKDOWN
    with tab2:
        st.subheader("Component Score Analysis")

        col1, col2 = st.columns(2)

        with col1:
            # Score components distribution
            score_cols = ['score_crime', 'score_transport', 'score_schools', 'score_greenspace', 'score_affordability']
            box_data = []
            for col in score_cols:
                box_data.append(
                    go.Box(y=filtered_df[col], name=col.replace('score_', '').title())
                )

            fig = go.Figure(data=box_data)
            fig.update_layout(
                title='Distribution of Component Scores',
                yaxis_title='Score (0-100)',
                boxmode='group'
            )
            st.plotly_chart(fig, use_container_width=True)

        with col2:
            # Current weights
            st.markdown("### Current Scoring Weights")
            weights_df = pd.DataFrame([
                {'Metric': k.replace('score_', '').title(), 'Weight': f'{v:.0%}'}
                for k, v in current_weights.items()
            ])
            st.dataframe(weights_df, use_container_width=True, hide_index=True)

            # Score statistics
            st.markdown("### Overall Statistics")
            stats_data = {
                'Metric': ['Min', 'Q1', 'Median', 'Q3', 'Max'],
                'Score': [
                    f"{filtered_df['score_total'].min():.1f}",
                    f"{filtered_df['score_total'].quantile(0.25):.1f}",
                    f"{filtered_df['score_total'].median():.1f}",
                    f"{filtered_df['score_total'].quantile(0.75):.1f}",
                    f"{filtered_df['score_total'].max():.1f}",
                ]
            }
            st.dataframe(pd.DataFrame(stats_data), use_container_width=True, hide_index=True)

    # TAB 3: SUBURB COMPARISON
    with tab3:
        st.subheader("Compare Multiple Suburbs")

        # Multi-select suburbs
        selected_suburbs = st.multiselect(
            "Select suburbs to compare:",
            filtered_df['name'].sort_values().unique(),
            default=filtered_df.nlargest(3, 'score_total')['name'].tolist()
        )

        if selected_suburbs:
            comparison_df = filtered_df[filtered_df['name'].isin(selected_suburbs)]

            # Radar chart comparison
            score_cols = ['score_crime', 'score_transport', 'score_schools', 'score_greenspace', 'score_affordability']
            categories = [col.replace('score_', '').title() for col in score_cols]

            fig = go.Figure()
            for _, row in comparison_df.iterrows():
                values = [row[col] for col in score_cols]
                fig.add_trace(go.Scatterpolar(
                    r=values + [values[0]],  # Complete the circle
                    theta=categories + [categories[0]],
                    fill='toself',
                    name=row['name']
                ))

            fig.update_layout(
                polar=dict(radialaxis=dict(visible=True, range=[0, 100])),
                title='Suburb Score Profiles',
                hovermode='closest',
                height=600
            )
            st.plotly_chart(fig, use_container_width=True)

            # Detailed comparison table
            st.markdown("### Detailed Comparison")
            display_cols = ['name', 'score_total', 'score_crime', 'score_transport', 'score_schools', 'score_greenspace', 'score_affordability']
            comparison_table = comparison_df[display_cols].copy()
            comparison_table.columns = ['Suburb', 'Total', 'Crime', 'Transport', 'Schools', 'Green Space', 'Affordability']
            st.dataframe(comparison_table, use_container_width=True, hide_index=True)

    # TAB 4: METRICS ANALYSIS
    with tab4:
        st.subheader("Individual Metric Analysis")

        metric_choice = st.selectbox("Select a metric:", list(metric_options.keys()))
        metric_col = metric_options[metric_choice]

        if metric_col in filtered_df.columns:
            col1, col2 = st.columns(2)

            with col1:
                # Distribution
                fig = px.histogram(
                    filtered_df.dropna(subset=[metric_col]),
                    x=metric_col,
                    title=f'{metric_choice} Distribution',
                    nbins=25,
                    color_discrete_sequence=['#1f77b4']
                )
                st.plotly_chart(fig, use_container_width=True)

            with col2:
                # Top/Bottom suburbs
                st.markdown(f"### Top Suburbs by {metric_choice}")
                top_metric = filtered_df.nlargest(5, metric_col)[['name', metric_col]]
                top_metric.columns = ['Suburb', metric_choice]
                st.dataframe(top_metric.reset_index(drop=True), use_container_width=True, hide_index=True)

            # Correlation with total score
            if metric_col in filtered_df.columns and 'score_total' in filtered_df.columns:
                corr = filtered_df[[metric_col, 'score_total']].corr().iloc[0, 1]
                st.markdown(f"**Correlation with Total Score:** {corr:.3f}")

                # Scatter plot
                fig = px.scatter(
                    filtered_df.dropna(subset=[metric_col]),
                    x=metric_col,
                    y='score_total',
                    hover_data=['name'],
                    title=f'{metric_choice} vs Overall Liveability',
                    labels={'score_total': 'Total Score'},
                    color_discrete_sequence=['#1f77b4']
                )
                st.plotly_chart(fig, use_container_width=True)

    # TAB 5: SYSTEM HEALTH
    with tab5:
        st.subheader("Data Quality & System Health")

        col1, col2 = st.columns(2)

        with col1:
            st.markdown("### Data Coverage")
            coverage = (df.notna().sum() / len(df) * 100).round(1)
            coverage_display = coverage[coverage.index != 'id'].sort_values()

            fig = px.barh(
                x=coverage_display.values,
                y=coverage_display.index,
                title='Data Availability by Metric',
                labels={'x': 'Coverage (%)', 'y': 'Metric'},
                color_discrete_sequence=['#1f77b4']
            )
            fig.add_vline(x=90, line_dash="dash", line_color="orange", annotation_text="90% target")
            st.plotly_chart(fig, use_container_width=True)

        with col2:
            st.markdown("### Quality Metrics")
            quality_metrics = {
                'Total Suburbs': len(df),
                'Suburbs with Full Data': (df[['rate_per_100k', 'stop_count', 'avg_icsea_score', 'green_pct_of_suburb', 'median_house_price']].notna().all(axis=1)).sum(),
                'Missing Crime Data': df['rate_per_100k'].isna().sum(),
                'Missing Transport Data': df['stop_count'].isna().sum(),
                'Missing School Data': df['avg_icsea_score'].isna().sum(),
                'Missing Green Space Data': df['green_pct_of_suburb'].isna().sum(),
                'Missing Property Data': df['median_house_price'].isna().sum(),
            }

            for metric, value in quality_metrics.items():
                if 'Missing' in metric:
                    st.metric(metric, value, delta=f"{value/len(df)*100:.1f}%")
                else:
                    st.metric(metric, value)

        # Last computation time
        if 'computed_at' in df.columns and df['computed_at'].notna().any():
            latest_run = df['computed_at'].max()
            st.info(f"📅 Last score computation: {latest_run}")


if __name__ == "__main__":
    main()
